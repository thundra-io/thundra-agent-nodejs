import Integration from './Integration';
import ModuleUtils from '../utils/ModuleUtils';
import ExecutionContextManager from '../context/ExecutionContextManager';
import ThundraSpan from '../opentracing/Span';
import { AWSServiceIntegration } from './AWSServiceIntegration';
import * as opentracing from 'opentracing';
import { DB_INSTANCE } from 'opentracing/lib/ext/tags';
import ThundraLogger from '../ThundraLogger';
import Utils from '../utils/Utils';
import ThundraChaosError from '../error/ThundraChaosError';

const shimmer = require('shimmer');
const has = require('lodash.has');
const get = require('lodash.get');

const MODULE_NAMES = ['@aws-sdk/smithy-client']; // /dist-cjs/client.js
const MODULE_VERSION = '3.x';

/**
 * {@link Integration} implementation for AWS integration
 * through {@code aws-sdk v3} library
 */
export class AWSv3Integration implements Integration {

    config: any;
    private wrappedFuncs: any;
    private instrumentContext: any;

    constructor(config: any) {
        this.wrappedFuncs = {};
        this.config = config || {};
        this.instrumentContext = ModuleUtils.instrument(
            MODULE_NAMES, MODULE_VERSION,
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

            return function AWSSDKWrapper(command: any, optionsOrCb: any, cb: any) {

                ThundraLogger.debug('<AWSv3Integration> Tracing HTTP request:', command);

                let activeSpan: ThundraSpan;
                try {
                    const { tracer } = ExecutionContextManager.get();

                    if (!tracer) {
                        return wrappedFunction.apply(this, [command, optionsOrCb, cb]);
                    }

                    const orginalOptions = typeof optionsOrCb !== 'function' ? optionsOrCb : undefined;
                    const originalCallback = typeof optionsOrCb === 'function' ? optionsOrCb : cb;

                    const currentInstance = this;
                    currentInstance.__thundra__ = {
                        operation: Utils.makeLowerCase(command.constructor.name.replace('Command', '')),
                        params: command.input,
                        service: {
                            serviceIdentifier: currentInstance.config.serviceId.toLowerCase(),
                            config: {},
                        },
                        response: {},
                    };

                    const originalFunction = integration.getOriginalFunction(wrappedFunctionName);

                    activeSpan = AWSServiceIntegration.doCreateSpan(
                        tracer,
                        currentInstance.__thundra__,
                        config,
                    );

                    currentInstance.middlewareStack.add(
                        (next: any, context: any) => async (args: any) => {

                            if (args && args.request) {
                                const httpRequest = args.request;
                                const headers = httpRequest.headers ? httpRequest.headers : {};
                                tracer.inject(activeSpan.spanContext, opentracing.FORMAT_TEXT_MAP, headers);
                                args.request.headers = headers;
                            }

                            activeSpan._initialized();

                            const result = await next(args);
                            return result;
                        }, {
                            step: 'build',
                            priority: 'low',
                            name: 'thundra_build_middileware',
                            tags: ['__thundra__'],
                        },
                    );

                    currentInstance.middlewareStack.add(
                        (next: any, context: any) => async (args: any) => {

                            currentInstance.__thundra__.service.config.region = await currentInstance.config.region();
                            currentInstance.__thundra__.service.config.endpoint = await currentInstance.config.endpoint();

                            activeSpan.tags[DB_INSTANCE] = currentInstance.__thundra__.service.config.endpoint.hostname;

                            const result = await next(args);

                            currentInstance.__thundra__.response = result.response;
                            return result;
                        }, {
                            step: 'deserialize',
                            priority: 'low',
                            name: 'thundra_deserialize_middileware',
                            tags: ['__thundra__'],
                        },
                    );

                    if (originalCallback) {

                        const wrappedCallback = function (err: any, data: any) {
                            if (err && activeSpan) {
                                activeSpan.setErrorTag(err);
                            }

                            currentInstance.middlewareStack.removeByTag('__thundra__');

                            currentInstance.__thundra__.response = {
                                ...currentInstance.__thundra__.response,
                                ...( data ? { data } : undefined ),
                                httpResponse: { ...currentInstance.__thundra__.response },
                            };

                            if (data) {
                                try {
                                    AWSServiceIntegration.doProcessResponse(
                                        activeSpan,
                                        currentInstance.__thundra__,
                                        currentInstance.__thundra__.response,
                                        config,
                                    );

                                    AWSServiceIntegration.injectTraceLink(
                                        activeSpan,
                                        currentInstance.__thundra__,
                                        currentInstance.__thundra__.response,
                                        config,
                                    );
                                } catch (error) {
                                    ThundraLogger.error(error);
                                }
                            }

                            if (activeSpan) {
                                activeSpan.closeWithCallback(this, originalCallback, [err, data]);
                            }
                        };

                        return originalFunction.apply(this, [command, orginalOptions, wrappedCallback]);
                    } else {

                        const result = originalFunction.apply(this, [command, orginalOptions, cb]);
                        if (typeof result.then === 'function') {
                            result.then((data: any) => {

                                currentInstance.middlewareStack.removeByTag('__thundra__');

                                currentInstance.__thundra__.response = {
                                    ...currentInstance.__thundra__.response,
                                    ...( currentInstance.__thundra__ ? { data } : undefined ),
                                    httpResponse: { ...currentInstance.__thundra__.response },
                                };

                                try {
                                    AWSServiceIntegration.doProcessResponse(
                                        activeSpan,
                                        currentInstance.__thundra__,
                                        currentInstance.__thundra__.response,
                                        config,
                                    );

                                    AWSServiceIntegration.injectTraceLink(
                                        activeSpan,
                                        currentInstance.__thundra__,
                                        currentInstance.__thundra__.response,
                                        config,
                                    );
                                } catch (error) {
                                    ThundraLogger.error(error);
                                } finally {

                                    if (activeSpan) {
                                        activeSpan.close();
                                    }
                                }
                            }).catch((error: any) => {

                                if (activeSpan) {

                                    activeSpan.setErrorTag(error);
                                    if (error.injectedByThundra) {
                                        activeSpan.close();
                                    }
                                }
                            });
                        }

                        return result;
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
                        return originalFunction.apply(this, [command, optionsOrCb, cb]);
                    }
                }
            };
        }

        if (has(lib, 'Client.prototype.send')) {

            ThundraLogger.debug('<AWSv3Integration> Wrapping "Client.prototype.send"');
            shimmer.wrap(lib.Client.prototype, 'send', (wrapped: Function) => wrapper(wrapped, 'send'));
        }
    }

    /**
     * Unwraps given library
     * @param lib the library to be unwrapped
     */
    doUnwrap(lib: any) {
        if (has(lib, 'Client.prototype.send')) {
            shimmer.unwrap(lib.Client.prototype, 'send');
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
