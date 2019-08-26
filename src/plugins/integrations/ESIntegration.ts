import Integration from './Integration';
import ThundraTracer from '../../opentracing/Tracer';
import {
    DBTags, SpanTags, SpanTypes, DomainNames, DBTypes, ESTags,
    LAMBDA_APPLICATION_DOMAIN_NAME, LAMBDA_APPLICATION_CLASS_NAME,
} from '../../Constants';
import ModuleVersionValidator from './ModuleVersionValidator';
import ThundraLogger from '../../ThundraLogger';
import ThundraSpan from '../../opentracing/Span';
import InvocationSupport from '../support/InvocationSupport';
import Utils from '../utils/Utils';

const has = require('lodash.has');
const shimmer = require('shimmer');
const moduleName = 'elasticsearch';

class ESIntegration implements Integration {
    config: any;
    lib: any;
    version: string;
    basedir: string;
    wrapped: boolean;

    constructor(config: any) {
        this.wrapped = false;
        this.version = '>=10.5';
        this.lib = Utils.tryRequire(moduleName);

        if (this.lib) {
            const { basedir } = Utils.getModuleInfo(moduleName);
            if (!basedir) {
                ThundraLogger.getInstance().error(`Base directory is not found for the package ${moduleName}`);
                return;
            }
            const moduleValidator = new ModuleVersionValidator();
            const isValidVersion = moduleValidator.validateModuleVersion(basedir, this.version);
            if (!isValidVersion) {
                ThundraLogger.getInstance().error(`Invalid module version for ${moduleName} integration.
                                            Supported version is ${this.version}`);
                return;
            } else {
                this.config = config;
                this.basedir = basedir;
                this.wrap.call(this, this.lib, config);
            }
        }
    }

    static hostSelect(me: any): Promise<any> {
        const defaultHost = {
            host: 'unknown',
            port: 0,
        };

        return new Promise((resolve, reject) => {
            if (!me || !me.connectionPool || !me.connectionPool.select) {
                return resolve(defaultHost);
            }
            me.connectionPool.select((err: any, data: any) => {
                if (err) {
                    ThundraLogger.getInstance().error(`Could not get host information. ${err}`);
                    return resolve(defaultHost);
                }
                return resolve(data.host);
            });
        });
    }

    getNormalizedPath(path: string): string {
        try {
            const depth = this.config.esPathDepth;
            if (depth <= 0) {
                return '';
            }
            const normalizedPath = '/' + path.split('/').filter((c) => c !== '').slice(0, depth).join('/');
            return normalizedPath;
        } catch (error) {
            return path;
        }
    }

    wrap(lib: any, config: any) {
        const plugin = this;
        function wrapRequest(request: any) {
            let span: ThundraSpan;

            return async function requestWithTrace(params: any, cb: any) {
                try {
                    const tracer = ThundraTracer.getInstance();

                    if (!tracer) {
                        return request.call(this, params, cb);
                    }

                    const me = this;
                    const functionName = InvocationSupport.getFunctionName();
                    const parentSpan = tracer.getActiveSpan();
                    const host = await ESIntegration.hostSelect(me);
                    const normalizedPath = plugin.getNormalizedPath(params.path);
                    span = tracer._startSpan(normalizedPath, {
                        childOf: parentSpan,
                        domainName: DomainNames.DB,
                        className: DBTypes.ELASTICSEARCH.toUpperCase(),
                        disableActiveStart: true,
                    });

                    span.addTags({
                        [SpanTags.SPAN_TYPE]: SpanTypes.ELASTIC,
                        [DBTags.DB_HOST]: host ? host.host : undefined,
                        [DBTags.DB_PORT]: host ? host.port : undefined,
                        [DBTags.DB_TYPE]: DBTypes.ELASTICSEARCH,
                        [SpanTags.TOPOLOGY_VERTEX]: true,
                        [SpanTags.TRIGGER_DOMAIN_NAME]: LAMBDA_APPLICATION_DOMAIN_NAME,
                        [SpanTags.TRIGGER_CLASS_NAME]: LAMBDA_APPLICATION_CLASS_NAME,
                        [SpanTags.TRIGGER_OPERATION_NAMES]: [functionName],
                        [ESTags.ES_URL]: params.path,
                        [ESTags.ES_METHOD]: params.method,
                        [ESTags.ES_PARAMS]: config.maskElasticSearchStatement ?
                            undefined : JSON.stringify(params.query),
                    });

                    if (JSON.stringify(params.body)) {
                        span.setTag(ESTags.ES_BODY, config.maskElasticSearchStatement ?
                            undefined : JSON.stringify(params.body));
                        span.setTag(DBTags.DB_STATEMENT, config.maskElasticSearchStatement ?
                            undefined : JSON.stringify(params.body));
                    }

                    span.addTags({
                        [DBTags.DB_STATEMENT_TYPE]: params.method,
                        [SpanTags.OPERATION_TYPE]: params.method,
                    });

                    const originalCallback = cb;

                    const wrappedCallback = (err: any, res: any) => {
                        if (err) {
                            span.setErrorTag(err);
                        }

                        span.closeWithCallback(me, originalCallback, [err, res]);
                    };

                    if (typeof cb === 'function') {
                        return request.call(this, params, wrappedCallback);
                    } else {
                        const promise = request.apply(this, arguments);

                        promise.then(() => {
                            span.finish();
                        }).catch((err: any) => {
                            span.setErrorTag(err);
                            span.finish();
                        });

                        return promise;
                    }

                } catch (error) {
                    if (span) {
                        span.close();
                    }

                    ThundraLogger.getInstance().error(error);
                    return request.call(this, params, cb);
                }
            };
        }

        if (this.wrapped) {
            this.unwrap();
        }

        if (has(lib, 'Transport.prototype.request')) {
            shimmer.wrap(lib.Transport.prototype, 'request', wrapRequest);
            this.wrapped = true;
        }
    }

    unwrap() {
        shimmer.unwrap(this.lib.Transport.prototype, 'request');
        this.wrapped = false;
    }
}

export default ESIntegration;
