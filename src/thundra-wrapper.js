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
* report function uses the Reporter instance to make a single HTTPS request to send reports if async monitoring is
* not enabled (environment variable thundra_lambda_publish_cloudwatch_enable is not set). After reporting it calls
* original callback/succeed/done/fail.
* 
*/

import uuidv4 from "uuid/v4";
import Reporter from "./reporter";

class ThundraWrapper {
    constructor(self, event, context, callback, func, plugins, pluginContext, apiKey) {
        this.originalThis = self;
        this.originalEvent = event;
        this.originalContext = context;
        this.originalCallback = callback;
        this.originalFunction = func;
        this.plugins = plugins;
        this.pluginContext = pluginContext;
        this.apiKey = apiKey;
        this.reported = false;
        this.reporter = new Reporter(apiKey);
        this.wrappedContext = {
            ...context,
            done: (error, result) => {
                this.report(error, result, () => {
                    this.originalContext.done(error, result)
                });
            },
            succeed: (result) => {
                this.report(null, result, () => {
                    this.originalContext.succeed(result)
                });
            },
            fail: (error) => {
                this.report(error, null, () => {
                    this.originalContext.fail(error)
                });
            }
        };
    }


    wrappedCallback = (error, result) => {
        this.report(error, result, () => {
                if (typeof this.originalCallback === "function") {
                    this.originalCallback(error, result);
                }
            }
        );
    };

    invoke() {
        const beforeInvocationData = {
            originalContext: this.originalContext,
            originalEvent: this.originalEvent,
            reporter: this.reporter,
            contextId: uuidv4()
        };

        this.executeHook("before-invocation", beforeInvocationData)
            .then(() => {
                this.pluginContext.requestCount += 1;
                try {
                    return this.originalFunction.call(
                        this.originalThis,
                        this.originalEvent,
                        this.wrappedContext,
                        this.wrappedCallback
                    );
                } catch (error) {
                    this.report(error, null);
                    return error;
                }
            });
    }

    async executeHook(hook, data) {
        await Promise.all(
            this.plugins.map(async plugin => {
                if (plugin.hooks && plugin.hooks[hook]) {
                    return plugin.hooks[hook](data);
                }
            })
        );
    }

    async report(error, result, callback) {
        if (!this.reported) {
            this.reported = true;
            const afterInvocationData = {
                error: error,
                response: result
            };
            await this.executeHook("after-invocation", afterInvocationData);
            if (process.env.thundra_lambda_publish_cloudwatch_enable !== "true") {
                await this.reporter.sendReports();
            }
            if (typeof callback === "function") {
                callback();
            }
        }
    }
}

export default ThundraWrapper;


