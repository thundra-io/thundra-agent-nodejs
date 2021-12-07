import Integration from './Integration';
import {
    SpanTypes,
    SpanTags,
    DomainNames,
    ClassNames,
    INTEGRATIONS,
    GoogleCommonTags,
    GoogleBigQueryTags,
    GoogleCommonOperationTypes,
} from '../Constants';
import ModuleUtils from '../utils/ModuleUtils';
import ThundraLogger from '../ThundraLogger';
import ThundraSpan from '../opentracing/Span';
import ThundraChaosError from '../error/ThundraChaosError';
import ExecutionContextManager from '../context/ExecutionContextManager';
import ConfigNames from '../config/ConfigNames';
import ConfigProvider from '../config/ConfigProvider';

const shimmer = require('shimmer');
const has = require('lodash.has');
const get = require('lodash.get');
const sizeof = require('object-sizeof');

const INTEGRATION_NAME = 'googlecloud.common';
const URL_SPLIT_STRING = 'googleapis.com/';
const BIG_QUERY = 'bigquery';

/**
 * {@link Integration} implementation for Google Common services
 * through {@code makeRequest}
 */
class GoogleCloudCommonIntegration implements Integration {

    config: any;
    private wrappedFuncs: any;
    private instrumentContext: any;

    constructor(config: any) {
        ThundraLogger.debug('<GoogleCloudCommonIntegration> Activating Google Common integration');

        this.wrappedFuncs = {};
        this.config = config || {};

        const googleCloudCommonIntegration = INTEGRATIONS[INTEGRATION_NAME];
        this.instrumentContext = ModuleUtils.instrument(
            googleCloudCommonIntegration.moduleNames, googleCloudCommonIntegration.moduleVersion,
            (lib: any, cfg: any, moduleName: string) => {
                this.wrap.call(this, lib, cfg, moduleName);
            },
            (lib: any, cfg: any, moduleName: string) => {
                this.doUnwrap.call(this, lib, moduleName);
            },
            this.config);
    }

    private static getQueryStatement(options: any) {
        if (options && options.json && options.json.configuration
            && options.json.configuration.query) {
            const query = options.json.configuration.query;
            return typeof query === 'string' ? query
                : typeof query.query === 'string' ? query.query : undefined;
        }
    }

    /**
     * @inheritDoc
     */
    wrap(lib: any, thundraConfig: any, moduleName: string): void {
        ThundraLogger.debug('<GoogleCloudCommonIntegration> Wrap');

        const integration = this;
        function requestWrapper(original: any, wrappedFunctionName: string) {
            integration.wrappedFuncs[wrappedFunctionName] = original;
            return function internalWrapper(options: any, config: any, callback: any) {
                if (options.uri.indexOf(BIG_QUERY) === -1) {
                    return original.apply(this, [options, config, callback]);
                }

                const originalCallback = callback;
                let span: ThundraSpan;
                let reachedToCallOriginalFunc: boolean = false;
                try {

                    ThundraLogger.debug('<GoogleCloudCommonIntegration> Tracing GoogleCloudCommonIntegration makeRequest:',
                        config);

                    const { tracer } = ExecutionContextManager.get();
                    if (!tracer) {
                        ThundraLogger.debug(`<GoogleCloudCommonIntegration> Skipped tracing makeRequest
                            as no tracer is available`);
                        return original.apply(this, [options, config, callback]);
                    }

                    const originalFunction = integration.getOriginalFunction(wrappedFunctionName);

                    const parentSpan = tracer.getActiveSpan();

                    const uri = options.uri.split(URL_SPLIT_STRING)[1] || '';
                    const splitUri = uri.split('/');
                    const service = splitUri[0] || 'google-cloud';
                    const projectId = splitUri[3] || '';
                    const path = uri.split(`${projectId}/`)[1];
                    const operation = path.split('/')[0] || '';
                    const queryStatement = GoogleCloudCommonIntegration.getQueryStatement(options);

                    ThundraLogger.debug(`<GoogleCloudCommonIntegration> Starting makeRequest span with name ${service}`);

                    span = tracer._startSpan(service, {
                        childOf: parentSpan,
                        domainName: DomainNames.API,
                        className: ClassNames.GOOGLE_BIGQUERY,
                        disableActiveStart: true,
                    });

                    const tags = {
                        [GoogleCommonTags.PROJECT_ID]: projectId,
                        [GoogleCommonTags.SERVICE]: service,
                        [GoogleBigQueryTags.OPERATION]: operation,
                        ...(queryStatement ? { [GoogleBigQueryTags.QUERY]: queryStatement } : undefined),
                        [SpanTags.OPERATION_TYPE]: GoogleCommonOperationTypes.QUERY,
                        [SpanTags.SPAN_TYPE]: SpanTypes.GOOGLE_BIGQUERY,
                        [SpanTags.TOPOLOGY_VERTEX]: true,
                    };

                    span.addTags(tags);
                    const wrappedCallback = (err: any, res: any)  => {
                        if (!span) {
                            if (originalCallback) {
                                originalCallback(err, res);
                            }

                            return;
                        }

                        if (err) {
                            span.setErrorTag(err);
                        } else if (res) {
                            const responseSize = sizeof(res);
                            const responseMaxSize = ConfigProvider.get<number>(
                                ConfigNames.THUNDRA_TRACE_INTEGRATIONS_GOOGLE_BIGQUERY_RESPONSE_SIZE_MAX);
                            if (responseSize <= responseMaxSize) {
                                span.addTags({
                                    [GoogleBigQueryTags.RESPONSE]: res,
                                });
                            } else if (res.jobReference && res.jobReference.jobId) {
                                span.addTags({
                                    [GoogleBigQueryTags.JOB_ID]: res.jobReference.jobId,
                                });
                            }
                        }

                        if (originalCallback) {
                            span.closeWithCallback(this, originalCallback, [err, res]);
                        } else {
                            span.close();
                        }
                    };

                    span._initialized();
                    reachedToCallOriginalFunc = true;

                    return originalFunction.apply(this, [options, config, wrappedCallback]);
                } catch (error) {
                    ThundraLogger.error('<GoogleCloudCommonIntegration> Error occurred while tracing Common makeRequest:', error);
                    if (span) {
                        span.setErrorTag(error);
                        span.close();
                    }

                    if (originalCallback && (reachedToCallOriginalFunc || error instanceof ThundraChaosError)) {
                        return originalCallback(error);
                    } else {
                        return original.apply(this, [options, config, callback]);
                    }
                }
            };
        }

        if (has(lib, 'util')) {
            ThundraLogger.debug('<GoogleCloudCommonIntegration> Wrapping "util.makeRequest"');
            shimmer.wrap(lib.util, 'makeRequest', (wrapped: Function) => requestWrapper(wrapped, 'makeRequest'));
        }
    }

    /**
     * Unwraps given library
     * @param lib the library to be unwrapped
     */
    doUnwrap(lib: any, moduleName: string) {
        ThundraLogger.debug('<GoogleCloudCommonIntegration> Do unwrap');

        if (has(lib, 'util.makeRequest')) {
            ThundraLogger.debug('<GoogleCloudCommonIntegration> Unwrapping "util.makeRequest"');
            shimmer.unwrap(lib.util, 'makeRequest');
        }
    }

    /**
     * @inheritDoc
     */
    unwrap(): void {
        ThundraLogger.debug('<GoogleCloudCommonIntegration> Unwrap');

        if (this.instrumentContext.uninstrument) {
            this.instrumentContext.uninstrument();
        }
    }

    private getOriginalFunction(wrappedFunctionName: string) {
        return get(this, `wrappedFuncs.${wrappedFunctionName}`);
    }
}

export default GoogleCloudCommonIntegration;
