import Integration from './Integration';
import {
    DBTags,
    SpanTags,
    SpanTypes,
    DomainNames,
    DBTypes,
    ESTags,
    ClassNames,
    INTEGRATIONS,
} from '../Constants';
import ThundraLogger from '../ThundraLogger';
import ThundraSpan from '../opentracing/Span';
import Utils from '../utils/Utils';
import ModuleUtils from '../utils/ModuleUtils';
import ThundraChaosError from '../error/ThundraChaosError';
import ExecutionContextManager from '../context/ExecutionContextManager';

const has = require('lodash.has');
const shimmer = require('shimmer');

const INTEGRATION_NAME = 'esLegacy';

/**
 * {@link Integration} implementation for Elasticsearch integration
 * through {@code elasticsearch} library
 */
class ESLegacyIntegration implements Integration {

    config: any;
    private instrumentContext: any;

    constructor(config: any) {
        ThundraLogger.debug('<ESLegacyIntegration> Activating ES integration');

        this.config = config || {};
        const esLegacyIntegration = INTEGRATIONS[INTEGRATION_NAME];
        this.instrumentContext = ModuleUtils.instrument(
            esLegacyIntegration.moduleNames, esLegacyIntegration.moduleVersion,
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
                    ThundraLogger.error('<ESLegacyIntegration> Could not get host information:', err);
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
        ThundraLogger.debug('<ESLegacyIntegration> Wrap');

        function wrapRequest(request: any) {
            return async function requestWithTrace(params: any, cb: any) {
                let span: ThundraSpan;

                try {
                    ThundraLogger.debug('<ESLegacyIntegration> Tracing Elasticsearch request:', params);

                    const { tracer } = ExecutionContextManager.get();

                    if (!tracer) {
                        ThundraLogger.debug('<ESLegacyIntegration> Skipped tracing request as no tracer is available');
                        return request.call(this, params, cb);
                    }

                    const me = this;
                    const parentSpan = tracer.getActiveSpan();
                    const host = await ESLegacyIntegration.hostSelect(me);

                    const normalizedPath = Utils.getNormalizedPath(params.path, config.esPathDepth);

                    ThundraLogger.debug(`<ESLegacyIntegration> Starting Elasticsearch span with name ${normalizedPath}`);

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
                        [ESTags.ES_URI]: params.path,
                        [ESTags.ES_NORMALIZED_URI]: normalizedPath,
                        [ESTags.ES_METHOD]: params.method,
                        [ESTags.ES_PARAMS]: config.maskElasticSearchBody ?
                            undefined : JSON.stringify(params.query),
                    });

                    if (!config.maskElasticSearchBody) {
                        try {
                            const requestBody: string = JSON.stringify(params.body);
                            if (requestBody) {
                                span.setTag(ESTags.ES_BODY, requestBody);

                                /**
                                 * elasticsearch.body allready set
                                 * span.setTag(DBTags.DB_STATEMENT, requestBody);
                                 */
                            }
                        } catch (e) {
                            ThundraLogger.error('<ESIntegration> Error occurred while serializing request body:', e);
                        }
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
                        ThundraLogger.debug(
                            `<ESLegacyIntegration> Closing Elasticsearch span with name ${span.getOperationName()}`);
                        span.closeWithCallback(me, originalCallback, [err, res]);
                    };

                    if (typeof cb === 'function') {
                        return request.call(this, params, wrappedCallback);
                    } else {
                        const promise = request.apply(this, arguments);

                        promise.then(() => {
                            ThundraLogger.debug(
                                `<ESLegacyIntegration> Closing Elasticsearch span with name ${span.getOperationName()}`);
                            span.finish();
                        }).catch((err: any) => {
                            span.setErrorTag(err);
                            ThundraLogger.debug(
                                `<ESLegacyIntegration> Closing Elasticsearch span with name ${span.getOperationName()}`);
                            span.finish();
                        });

                        return promise;
                    }

                } catch (error) {
                    ThundraLogger.error('<ESLegacyIntegration> Error occurred while tracing Elasticsearch request:', error);

                    if (span) {
                        ThundraLogger.debug(
                            `<ESLegacyIntegration> Because of error, closing Elasticsearch span with name
                            ${span.getOperationName()}`);
                        span.close();
                    }

                    if (error instanceof ThundraChaosError) {
                        throw error;
                    } else {
                        return request.call(this, params, cb);
                    }
                }
            };
        }

        if (has(lib, 'Transport.prototype.request')) {
            ThundraLogger.debug('<ESLegacyIntegration> Wrapping "elasticsearch.request"');

            shimmer.wrap(lib.Transport.prototype, 'request', wrapRequest);
        }
    }

    /**
     * Unwraps given library
     * @param lib the library to be unwrapped
     */
    doUnwrap(lib: any) {
        ThundraLogger.debug('<ESLegacyIntegration> Do unwrap');

        ThundraLogger.debug('<ESLegacyIntegration> Unwrapping "elasticsearch.request"');

        shimmer.unwrap(lib.Transport.prototype, 'request');
    }

    /**
     * @inheritDoc
     */
    unwrap() {
        ThundraLogger.debug('<ESLegacyIntegration> Unwrap');

        if (this.instrumentContext.uninstrument) {
            this.instrumentContext.uninstrument();
        }
    }
}

export default ESLegacyIntegration;
