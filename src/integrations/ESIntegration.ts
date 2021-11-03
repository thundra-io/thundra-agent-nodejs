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
import { Url } from 'url';

const has = require('lodash.has');
const shimmer = require('shimmer');

const INTEGRATION_NAME = 'es';

/**
 * {@link Integration} implementation for Elasticsearch integration
 * through {@code elasticsearch} library
 */
class ESIntegration implements Integration {

    config: any;
    private instrumentContext: any;

    constructor(config: any) {
        ThundraLogger.debug('<ESIntegration> Activating ES integration');

        this.config = config || {};
        const esIntegration = INTEGRATIONS[INTEGRATION_NAME];
        this.instrumentContext = ModuleUtils.instrument(
            esIntegration.moduleNames, esIntegration.moduleVersion,
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
        ThundraLogger.debug('<ESIntegration> Wrap');

        function wrapRequest(request: any) {

            return function requestWithTrace(params: any, options: any, cb: any) {

                let span: ThundraSpan;

                try {
                    ThundraLogger.debug('<ESIntegration> Tracing Elasticsearch request:', params);

                    const { tracer } = ExecutionContextManager.get();

                    if (!tracer) {
                        ThundraLogger.debug('<ESIntegration> Skipped tracing request as no tracer is available');
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

                    ThundraLogger.debug(`<ESIntegration> Starting Elasticsearch span with name ${normalizedPath}`);

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
                            `<ESIntegration> Closing Elasticsearch span with name ${span.getOperationName()}`);

                        span.closeWithCallback(currentInstace, originalCallback, [err, res]);
                    };

                    return request.call(this, params, options, wrappedCallback);
                } catch (error) {
                    ThundraLogger.error('<ESIntegration> Error occurred while tracing Elasticsearch request:', error);

                    if (span) {
                        ThundraLogger.debug(
                            `<ESIntegration> Because of error, closing Elasticsearch span with name
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
            ThundraLogger.debug('<ESIntegration> Wrapping "elasticsearch.request"');

            shimmer.wrap(lib.Transport.prototype, 'request', wrapRequest);
        }
    }

    /**
     * Unwraps given library
     * @param lib the library to be unwrapped
     */
    doUnwrap(lib: any) {
        ThundraLogger.debug('<ESIntegration> Do unwrap');

        ThundraLogger.debug('<ESIntegration> Unwrapping "elasticsearch.request"');

        shimmer.unwrap(lib.Transport.prototype, 'request');
    }

    /**
     * @inheritDoc
     */
    unwrap() {
        ThundraLogger.debug('<ESIntegration> Unwrap');

        if (this.instrumentContext.uninstrument) {
            this.instrumentContext.uninstrument();
        }
    }
}

export default ESIntegration;
