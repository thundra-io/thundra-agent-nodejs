import Integration from './Integration';
import {
    DBTags, SpanTags, SpanTypes, DomainNames, DBTypes, ESTags, ClassNames,
} from '../Constants';
import ThundraLogger from '../ThundraLogger';
import ThundraSpan from '../opentracing/Span';
import Utils from '../utils/Utils';
import ModuleUtils from '../utils/ModuleUtils';
import ThundraChaosError from '../error/ThundraChaosError';
import ExecutionContextManager from '../context/ExecutionContextManager';
import { Url } from 'url';

const has = require('lodash.has');
const shimmer = require('shimmer');

const MODULE_NAME = '@elastic/elasticsearch';
const MODULE_VERSION = '>=5.6.16';

/**
 * {@link Integration} implementation for Elasticsearch integration
 * through {@code elasticsearch} library
 */
class ESScopedIntegration implements Integration {

    config: any;
    private instrumentContext: any;

    constructor(config: any) {
        ThundraLogger.debug('<ESScopedIntegration> Activating ES integration');

        this.config = config || {};
        this.instrumentContext = ModuleUtils.instrument(
            [MODULE_NAME], MODULE_VERSION,
            (lib: any, cfg: any) => {
                this.wrap.call(this, lib, cfg);
            },
            (lib: any, cfg: any) => {
                this.doUnwrap.call(this, lib);
            },
            this.config);
    }

    /**
     * @inheritDoc
     */
    wrap(lib: any, config: any) {
        ThundraLogger.debug('<ESScopedIntegration> Wrap');

        function wrapRequest(request: any) {

            return function requestWithTrace(params: any, options: any, cb: any) {

                let span: ThundraSpan;

                try {
                    ThundraLogger.debug('<ESScopedIntegration> Tracing Elasticsearch request:', params);

                    const { tracer } = ExecutionContextManager.get();

                    if (!tracer) {
                        ThundraLogger.debug('<ESScopedIntegration> Skipped tracing request as no tracer is available');
                        return request.call(this, params, options, cb);
                    }

                    const originalCallback = request.length === 2 || typeof options === 'function' ?
                        options : cb;

                    if (typeof originalCallback !== 'function') {

                        return request.apply(this, arguments);
                    }

                    const currentInstace = this;
                    const parentSpan = tracer.getActiveSpan();

                    const normalizedPath = Utils.getNormalizedPath(params.path, config.esPathDepth);

                    ThundraLogger.debug(`<ESScopedIntegration> Starting Elasticsearch span with name ${normalizedPath}`);

                    span = tracer._startSpan(normalizedPath, {
                        childOf: parentSpan,
                        domainName: DomainNames.DB,
                        className: ClassNames.ELASTICSEARCH,
                        disableActiveStart: true,
                    });

                    span.addTags({
                        [SpanTags.SPAN_TYPE]: SpanTypes.ELASTIC,
                        [DBTags.DB_TYPE]: DBTypes.ELASTICSEARCH,
                        [SpanTags.TOPOLOGY_VERTEX]: true,
                        [ESTags.ES_URI]: params.path,
                        [ESTags.ES_NORMALIZED_URI]: normalizedPath,
                        [ESTags.ES_METHOD]: params.method,
                        [ESTags.ES_PARAMS]: config.maskElasticSearchBody ?
                            undefined : JSON.stringify(params.querystring),
                        [DBTags.DB_STATEMENT_TYPE]: params.method,
                        [SpanTags.OPERATION_TYPE]: params.method,
                    });

                    if (JSON.stringify(params.body)) {
                        span.setTag(ESTags.ES_BODY, config.maskElasticSearchBody ?
                            undefined : JSON.stringify(params.body));
                        span.setTag(DBTags.DB_STATEMENT, config.maskElasticSearchBody ?
                            undefined : JSON.stringify(params.body));
                    }

                    span._initialized();

                    const wrappedCallback = (err: any, res: any) => {

                        if (err) {
                            span.setErrorTag(err);
                        }

                        if (res && res.meta && res.meta.connection && res.meta.connection.url) {

                            const connectionUrl: Url = res.meta.connection.url;
                            span.addTags({
                                [DBTags.DB_HOST]: connectionUrl.hostname,
                                [DBTags.DB_PORT]: connectionUrl.port ? Number(connectionUrl.port) : undefined,
                            });
                        }

                        ThundraLogger.debug(
                            `<ESScopedIntegration> Closing Elasticsearch span with name ${span.getOperationName()}`);

                        span.closeWithCallback(currentInstace, originalCallback, [err, res]);
                    };

                    return request.call(this, params, options, wrappedCallback);
                } catch (error) {
                    ThundraLogger.error('<ESScopedIntegration> Error occurred while tracing Elasticsearch request:', error);

                    if (span) {
                        ThundraLogger.debug(
                            `<ESScopedIntegration> Because of error, closing Elasticsearch span with name
                            ${span.getOperationName()}`);
                        span.close();
                    }

                    if (error instanceof ThundraChaosError) {
                        throw error;
                    } else {
                        return request.call(this, params, options, cb);
                    }
                }
            };
        }

        if (has(lib, 'Transport.prototype.request')) {
            ThundraLogger.debug('<ESScopedIntegration> Wrapping "elasticsearch.request"');

            shimmer.wrap(lib.Transport.prototype, 'request', wrapRequest);
        }
    }

    /**
     * Unwraps given library
     * @param lib the library to be unwrapped
     */
    doUnwrap(lib: any) {
        ThundraLogger.debug('<ESScopedIntegration> Do unwrap');

        ThundraLogger.debug('<ESScopedIntegration> Unwrapping "elasticsearch.request"');

        shimmer.unwrap(lib.Transport.prototype, 'request');
    }

    /**
     * @inheritDoc
     */
    unwrap() {
        ThundraLogger.debug('<ESScopedIntegration> Unwrap');

        if (this.instrumentContext.uninstrument) {
            this.instrumentContext.uninstrument();
        }
    }
}

export default ESScopedIntegration;
