import Integration from './Integration';
import ModuleUtils from '../utils/ModuleUtils';
import ThundraLogger from '../ThundraLogger';
import ThundraSpan from '../opentracing/Span';
import * as opentracing from 'opentracing';
import ThundraChaosError from '../error/ThundraChaosError';
import ExecutionContextManager from '../context/ExecutionContextManager';
import { AWSServiceIntegration } from './AWSServiceIntegration';
import { INTEGRATIONS } from '../Constants';

const shimmer = require('shimmer');
const has = require('lodash.has');
const get = require('lodash.get');

const INTEGRATION_NAME = 'aws';

/**
 * {@link Integration} implementation for AWS integration
 * through {@code aws-sdk} library
 */
export class AWSIntegration implements Integration {

    config: any;
    private wrappedFuncs: any;
    private instrumentContext: any;

    constructor(config: any) {
        this.wrappedFuncs = {};
        this.config = config || {};
        const awsIntegration = INTEGRATIONS[INTEGRATION_NAME];
        this.instrumentContext = ModuleUtils.instrument(
            awsIntegration.moduleNames, awsIntegration.moduleVersion,
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
        AWSServiceIntegration.parseAWSOperationTypes();

        const integration = this;
        function wrapper(wrappedFunction: any, wrappedFunctionName: string) {
            integration.wrappedFuncs[wrappedFunctionName] = wrappedFunction;
            return function AWSSDKWrapper(callback: any) {
                let activeSpan: ThundraSpan;
                try {
                    const { tracer } = ExecutionContextManager.get();

                    if (!tracer) {
                        return wrappedFunction.apply(this, [callback]);
                    }

                    const request = this;
                    const originalCallback = callback;
                    const originalFunction = integration.getOriginalFunction(wrappedFunctionName);

                    request.params = request.params ? request.params : {};

                    activeSpan = AWSServiceIntegration.doCreateSpan(tracer, request, config);

                    if (request.httpRequest
                        && AWSServiceIntegration.isSpanContextInjectableToHeader(request)) {
                        const httpRequest = request.httpRequest;
                        const headers = httpRequest.headers ? httpRequest.headers : {};
                        tracer.inject(activeSpan.spanContext, opentracing.FORMAT_TEXT_MAP, headers);
                        httpRequest.headers = headers;
                    }

                    activeSpan._initialized();

                    if (originalCallback) {
                        const wrappedCallback = function (err: any, data: any) {
                            if (err && activeSpan) {
                                activeSpan.setErrorTag(err);
                            }
                            if (data) {
                                try {
                                    AWSServiceIntegration.doProcessResponse(activeSpan, request, request.response, config);
                                    AWSServiceIntegration.injectTraceLink(activeSpan, request, request.response, config);
                                } catch (error) {
                                    ThundraLogger.error(error);
                                }
                            }
                            if (activeSpan) {
                                activeSpan.closeWithCallback(this, originalCallback, [err, data]);
                            }
                        };

                        return originalFunction.apply(this, [wrappedCallback]);
                    } else {
                        request.on('error', (error: any) => {
                            if (error && activeSpan) {
                                activeSpan.setErrorTag(error);
                                if (error.injectedByThundra) {
                                    activeSpan.close();
                                }
                            }
                        }).on('complete', (response: any) => {
                            if (response) {
                                try {
                                    AWSServiceIntegration.doProcessResponse(activeSpan, request, request.response, config);
                                    AWSServiceIntegration.injectTraceLink(activeSpan, request, request.response, config);
                                } catch (error) {
                                    ThundraLogger.error(error);
                                }
                            }
                            if (activeSpan) {
                                try {
                                    activeSpan.close();
                                } catch (error) {
                                    if (error instanceof ThundraChaosError) {
                                        request.emit('error', error);
                                    } else {
                                        ThundraLogger.error(error);
                                    }
                                }
                            }
                        });

                        return originalFunction.apply(this, [originalCallback]);
                    }
                } catch (error) {
                    if (activeSpan) {
                        activeSpan.close();
                    }

                    if (error instanceof ThundraChaosError) {
                        this.response.error = error;
                        throw error;
                    } else {
                        ThundraLogger.error(error);
                        const originalFunction = integration.getOriginalFunction(wrappedFunctionName);
                        return originalFunction.apply(this, [callback]);
                    }
                }
            };
        }

        if (has(lib, 'Request.prototype.send') && has(lib, 'Request.prototype.promise')) {
            shimmer.wrap(lib.Request.prototype, 'send', (wrapped: Function) => wrapper(wrapped, 'send'));
            shimmer.wrap(lib.Request.prototype, 'promise', (wrapped: Function) => wrapper(wrapped, 'promise'));
        }
    }

    /**
     * Unwraps given library
     * @param lib the library to be unwrapped
     */
    doUnwrap(lib: any) {
        if (has(lib, 'Request.prototype.send') && has(lib, 'Request.prototype.promise')) {
            shimmer.unwrap(lib.Request.prototype, 'send');
            shimmer.unwrap(lib.Request.prototype, 'promise');
        }
    }

    /**
     * @inheritDoc
     */
    unwrap() {
        if (this.instrumentContext.uninstrument) {
            this.instrumentContext.uninstrument();
        }
    }

    private getOriginalFunction(wrappedFunctionName: string) {
        return get(this, `wrappedFuncs.${wrappedFunctionName}`);
    }

}
