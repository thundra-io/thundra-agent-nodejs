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

import Reporter from './Reporter';
import TimeoutError from './plugins/error/TimeoutError';
import HttpError from './plugins/error/HttpError';
import Utils from './plugins/utils/Utils';
import { envVariableKeys } from './Constants';
import ThundraConfig from './plugins/config/ThundraConfig';
import PluginContext from './plugins/PluginContext';

class ThundraWrapper {

    private originalThis: any;
    private originalEvent: any;
    private originalContext: any;
    private originalCallback: any;
    private originalFunction: any;
    private config: ThundraConfig;
    private plugins: any;
    private pluginContext: PluginContext;
    private reported: boolean;
    private reporter: Reporter;
    private wrappedContext: any;
    private timeout: NodeJS.Timer;

    constructor(self: any, event: any, context: any, callback: any,
                originalFunction: any, plugins: any, pluginContext: PluginContext) {
        this.originalThis = self;
        this.originalEvent = event;
        this.originalContext = context;
        this.originalCallback = callback;
        this.originalFunction = originalFunction;
        this.config = pluginContext.config ? pluginContext.config : new ThundraConfig({});
        this.plugins = plugins;
        this.pluginContext = pluginContext;
        this.pluginContext.maxMemory = parseInt(context.memoryLimitInMB, 10);
        this.reported = false;
        this.reporter = new Reporter(pluginContext.config);
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

        const me = this;
        this.wrappedContext = Object.assign({
            set callbackWaitsForEmptyEventLoop(value) {
                me.originalContext.callbackWaitsForEmptyEventLoop = value;
            },
            get callbackWaitsForEmptyEventLoop() {
                return me.originalContext.callbackWaitsForEmptyEventLoop;
            },
        }, this.wrappedContext);

        this.timeout = this.setupTimeoutHandler(this);
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
        };

        this.executeHook('before-invocation', beforeInvocationData, false)
            .then(() => {
                this.pluginContext.requestCount += 1;
                this.resetTime();
                this.pluginContext.invocationStartTimestamp = Date.now();

                try {
                    const result = this.originalFunction.call(
                        this.originalThis,
                        this.originalEvent,
                        this.wrappedContext,
                        this.wrappedCallback,
                    );

                    this.pluginContext.invocationFinishTimestamp = Date.now();

                    if (result && result.then !== undefined && typeof result.then === 'function') {
                        result.then(this.wrappedContext.succeed, this.wrappedContext.fail);
                    }

                    return result;
                } catch (error) {
                    this.report(error, null, null);
                    return error;
                }
            });
    }

    async executeHook(hook: any, data: any, reverse: boolean) {
        this.plugins.sort((p1: any, p2: any) => p1.pluginOrder > p2.pluginOrder ? 1 : -1);

        if (reverse) {
            this.plugins.reverse();
        }

        await Promise.all(
            this.plugins.map((plugin: any) => {
                if (plugin.hooks && plugin.hooks[hook]) {
                    return plugin.hooks[hook](data);
                }
            }),
        );
    }

    async executeAfteInvocationAndReport(afterInvocationData: any) {
        await this.executeHook('after-invocation', afterInvocationData, true);
        this.resetTime();

        if (Utils.getConfiguration(envVariableKeys.THUNDRA_LAMBDA_REPORT_CLOUDWATCH_ENABLE) !== 'true') {
            await this.reporter.sendReports();
        }
    }

    resetTime() {
        this.pluginContext.invocationStartTimestamp = undefined;
        this.pluginContext.invocationFinishTimestamp = undefined;
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

            if (this.config.sampleTimedOutInvocations) {
                if (error instanceof TimeoutError) {
                    await this.executeAfteInvocationAndReport(afterInvocationData);
                } else {
                    this.plugins.map((plugin: any) => {
                        if (plugin.destroy && typeof (plugin.destroy) === 'function') {
                            plugin.destroy();
                        }
                    });
                }
            } else {
                await this.executeAfteInvocationAndReport(afterInvocationData);
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
        return response.statusCode && typeof response.statusCode === 'number' && response.body;
    }

    setupTimeoutHandler(wrapperInstance: any): NodeJS.Timer | undefined {
        const { originalContext, pluginContext } = wrapperInstance;
        const { getRemainingTimeInMillis = () => 0 } = originalContext;

        if (pluginContext.timeoutMargin < 1 || getRemainingTimeInMillis() < 10) {
            return undefined;
        }
        const maxEndTime = 899900;
        const configEndTime = Math.max(
            0,
            getRemainingTimeInMillis() - pluginContext.timeoutMargin,
        );

        const endTime = Math.min(configEndTime, maxEndTime);

        return setTimeout(() => {
            wrapperInstance.report(new TimeoutError('Lambda is timed out.'), null, null);
            wrapperInstance.reported = false;
        }, endTime);
    }

}

export default ThundraWrapper;
