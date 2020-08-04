import Integration from './Integration';
import {
    DBTags, SpanTags, SpanTypes, DomainNames, DBTypes, ESTags,
    LAMBDA_APPLICATION_DOMAIN_NAME, LAMBDA_APPLICATION_CLASS_NAME, ClassNames,
} from '../Constants';
import ThundraLogger from '../ThundraLogger';
import ThundraSpan from '../opentracing/Span';
import Utils from '../utils/Utils';
import ThundraChaosError from '../error/ThundraChaosError';
import ExecutionContextManager from '../context/ExecutionContextManager';

const has = require('lodash.has');
const shimmer = require('shimmer');

const MODULE_NAME = 'elasticsearch';
const MODULE_VERSION = '>=10.5';

/**
 * {@link Integration} implementation for Elasticsearch integration
 * through {@code elasticsearch} library
 */
class ESIntegration implements Integration {

    config: any;
    private instrumentContext: any;

    constructor(config: any) {
        this.config = config || {};
        this.instrumentContext = Utils.instrument(
            [MODULE_NAME], MODULE_VERSION,
            (lib: any, cfg: any) => {
                this.wrap.call(this, lib, cfg);
            },
            (lib: any, cfg: any) => {
                this.doUnwrap.call(this, lib);
            },
            this.config);
    }

    private static hostSelect(me: any): Promise<any> {
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
                    ThundraLogger.error(`Could not get host information. ${err}`);
                    return resolve(defaultHost);
                }
                return resolve(data.host);
            });
        });
    }

    /**
     * @inheritDoc
     */
    wrap(lib: any, config: any) {
        const integration = this;

        function wrapRequest(request: any) {
            let span: ThundraSpan;

            return async function requestWithTrace(params: any, cb: any) {
                try {
                    const { tracer } = ExecutionContextManager.get();

                    if (!tracer) {
                        return request.call(this, params, cb);
                    }

                    const me = this;
                    const parentSpan = tracer.getActiveSpan();
                    const host = await ESIntegration.hostSelect(me);
                    const normalizedPath = integration.getNormalizedPath(params.path);
                    span = tracer._startSpan(normalizedPath, {
                        childOf: parentSpan,
                        domainName: DomainNames.DB,
                        className: ClassNames.ELASTICSEARCH,
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
                        [ESTags.ES_URI]: params.path,
                        [ESTags.ES_NORMALIZED_URI]: normalizedPath,
                        [ESTags.ES_METHOD]: params.method,
                        [ESTags.ES_PARAMS]: config.maskElasticSearchBody ?
                            undefined : JSON.stringify(params.query),
                    });

                    if (JSON.stringify(params.body)) {
                        span.setTag(ESTags.ES_BODY, config.maskElasticSearchBody ?
                            undefined : JSON.stringify(params.body));
                        span.setTag(DBTags.DB_STATEMENT, config.maskElasticSearchBody ?
                            undefined : JSON.stringify(params.body));
                    }

                    span.addTags({
                        [DBTags.DB_STATEMENT_TYPE]: params.method,
                        [SpanTags.OPERATION_TYPE]: params.method,
                    });

                    span._initialized();

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

                    if (error instanceof ThundraChaosError) {
                        throw error;
                    } else {
                        ThundraLogger.error(error);
                        return request.call(this, params, cb);
                    }
                }
            };
        }

        if (has(lib, 'Transport.prototype.request')) {
            shimmer.wrap(lib.Transport.prototype, 'request', wrapRequest);
        }
    }

    /**
     * Unwraps given library
     * @param lib the library to be unwrapped
     */
    doUnwrap(lib: any) {
        shimmer.unwrap(lib.Transport.prototype, 'request');
    }

    /**
     * @inheritDoc
     */
    unwrap() {
        if (this.instrumentContext.uninstrument) {
            this.instrumentContext.uninstrument();
        }
    }

    private getNormalizedPath(path: string): string {
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

}

export default ESIntegration;
