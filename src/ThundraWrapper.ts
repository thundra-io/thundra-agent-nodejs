/*
*
* Wraps the lambda handler function.
*
* Implemented in Hook & Plugin structure. Runs plugins' related functions by executing hooks.
*
* Wraps the original callback and context.
*
* invoke function calls the original lambda handler with original event, wrapped context and wrapped callback.
*
* Wrapped context methods (done, succeed, fail) and callback call report function.
*
* report function uses the Reporter instance to make a single request to send reports if async monitoring is
* not enabled (environment variable thundra_lambda_publish_cloudwatch_enable is not set). After reporting it calls
* original callback/succeed/done/fail.
*
*/

import * as uuidv4 from 'uuid/v4';
import Reporter from './Reporter';
import TimeoutError from './plugins/error/TimeoutError';
import HttpError from './plugins/error/HttpError';
import Utils from './plugins/Utils';
import { envVariableKeys } from './Constants';

class ThundraWrapper {

    private originalThis: any;
    private originalEvent: any;
    private originalContext: any;
    private originalCallback: any;
    private originalFunction: any;
    private plugins: any;
    private pluginContext: any;
    private reported: boolean;
    private reporter: Reporter;
    private wrappedContext: any;
    private timeout: NodeJS.Timer;
    private apiKey: string;

    constructor(self: any, event: any, context: any, callback: any,
                originalFunction: any, plugins: any, pluginContext: any, apiKey: any) {
        this.originalThis = self;
        this.originalEvent = event;
        this.originalContext = context;
        this.originalCallback = callback;
        this.originalFunction = originalFunction;
        this.plugins = plugins;
        this.pluginContext = pluginContext;
        this.reported = false;
        this.apiKey = apiKey;
        this.reporter = new Reporter(apiKey);
        this.wrappedContext = {
            ...context,
            done: (error: any, result: any) => {
                this.report(error, result, () => {
                    this.originalContext.done(error, result);
                });
            },
            succeed: (result: any) => {
                this.report(null, result, () => {
                    this.originalContext.succeed(result);
                });
            },
            fail: (error: any) => {
                this.report(error, null, () => {
                    this.originalContext.fail(error);
                });
            },
        };

        this.timeout = this.setupTimeoutHandler(this);
        /// consol
    }

    wrappedCallback = (error: any, result: any) => {
        this.report(error, result, () => {
                this.invokeCallback(error, result);
            },
        );
    }

    invokeCallback(error: any, result: any): void {
        if (typeof this.originalCallback === 'function') {
            this.originalCallback(error, result);
        }
    }

    invoke(): void {
        const beforeInvocationData = {
            originalContext: this.originalContext,
            originalEvent: this.originalEvent,
            reporter: this.reporter,
            contextId: uuidv4(),
        };

        this.executeHook('before-invocation', beforeInvocationData, false)
            .then(() => {
                this.pluginContext.requestCount += 1;
                try {
                    const result = this.originalFunction.call(
                        this.originalThis,
                        this.originalEvent,
                        this.wrappedContext,
                        this.wrappedCallback,
                    );
                    if (result instanceof Promise) {
                        result.then(
                            (data) => {
                                this.report(null, data, () => {
                                    this.invokeCallback(null, data);
                                });
                            },
                            (err) => {
                                this.report(err, null, () => {
                                    this.invokeCallback(err, null);
                                });
                            });
                    }
                    return result;
                } catch (error) {
                    this.report(error, null, null);
                    return error;
                }
        });
    }

    async executeHook(hook: any, data: any, reverse: boolean) {
        const plugins = reverse ? this.plugins.reverse() : this.plugins;
        await Promise.all(
            plugins.map((plugin: any) => {
                if (plugin.hooks && plugin.hooks[hook]) {
                    return plugin.hooks[hook](data);
                }
            }),
        );
    }

    async report(error: any, result: any, callback: any) {
        if (!this.reported) {
            this.reported = true;

            let afterInvocationData = {
                error,
                response: result,
            };

            if (this.isErrorResponse(result)) {
                afterInvocationData = {
                    error: new HttpError('Lambda returned with error response.'),
                    response: result,
                };
            }

            await this.executeHook('after-invocation', afterInvocationData, true);
            if (Utils.getConfiguration(envVariableKeys.THUNDRA_LAMBDA_REPORT_CLOUDWATCH_ENABLE) !== 'true') {
                await this.reporter.sendReports();
            }

            if (this.timeout) {
                clearTimeout(this.timeout);
            }

            if (typeof callback === 'function') {
                callback();
            }
        }
    }

    isErrorResponse(result: any) {
        let isError = false;
        if (this.isValidResponse(result) && typeof result.body === 'string') {
            const statusCode = result.statusCode.toString();
            if (statusCode.startsWith('4') || statusCode.startsWith('5')) {
                isError = true;
            }
        } else if (this.isValidResponse(result)) {
            isError = true;
        }
        return isError;
    }

    isValidResponse(response: any) {
        if (!response) {
            return false;
        }
        return response.statusCode && typeof response.statusCode  === 'number' && response.body ;
    }

    setupTimeoutHandler(wrapperInstance: any): NodeJS.Timer | undefined {
        const { originalContext, pluginContext } = wrapperInstance;
        const { getRemainingTimeInMillis = () => 0 } = originalContext;

        if (pluginContext.timeoutMargin < 1 || getRemainingTimeInMillis() < 10) {
          return undefined;
        }
        const maxEndTime = 299900;
        const configEndTime = Math.max(
          0,
          getRemainingTimeInMillis() - pluginContext.timeoutMargin,
        );

        const endTime = Math.min(configEndTime, maxEndTime);

        return setTimeout(() => {
          wrapperInstance.report(new TimeoutError('Lambda is timed out.'), null, null);
        }, endTime);
    }

}

export default ThundraWrapper;
