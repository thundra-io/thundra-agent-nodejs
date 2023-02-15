import Reporter from '../../Reporter';
import TimeoutError from '../../error/TimeoutError';
import HttpError from '../../error/HttpError';
import ThundraConfig from '../../plugins/config/ThundraConfig';
import PluginContext from '../../plugins/PluginContext';
import ThundraLogger from '../../ThundraLogger';
import Utils from '../../utils/Utils';
import ExecutionContextManager from '../../context/ExecutionContextManager';
import ExecutionContext from '../../context/ExecutionContext';
import HTTPUtils from '../../utils/HTTPUtils';
import LambdaUtils from '../../utils/LambdaUtils';
import SLSDebugger from '@thundra/slsdebugger/dist/debugger/SlsDebugger';

/**
 * Wraps the Lambda handler function.
 *
 * - Implemented in Hook & Plugin structure. Runs plugins' related functions by executing hooks.
 * - Wraps the original callback and context.
 * - {@link invoke} function calls the original Lambda handler with original event, wrapped context and wrapped callback.
 * - Wrapped context methods (done, succeed, fail) and callback call report function.
 * - {@link report} function uses the {@link Reporter} instance to to send collected reports.
 * - After reporting it calls original callback/succeed/done/fail.
 */
class LambdaHandlerWrapper {

    private originalThis: any;
    private originalEvent: any;
    private originalContext: any;
    private originalCallback: any;
    private originalFunction: any;
    private config: ThundraConfig;
    private plugins: any;
    private pluginContext: PluginContext;
    private completed: boolean;
    private reporter: Reporter;
    private wrappedContext: any;
    private timeout: NodeJS.Timer;
    private resolve: any;
    private reject: any;
    private slsDebugger?: SLSDebugger;

    constructor(self: any, event: any, context: any, callback: any, originalFunction: any,
                plugins: any, pluginContext: PluginContext, config: ThundraConfig, slsDebugger?: SLSDebugger) {
        this.originalThis = self;
        this.originalEvent = event;
        this.originalContext = context;
        this.originalCallback = callback;
        this.originalFunction = originalFunction;
        this.config = config || new ThundraConfig({ disableMonitoring: false });
        this.plugins = plugins;
        this.pluginContext = pluginContext;
        this.pluginContext.maxMemory = parseInt(context.memoryLimitInMB, 10);
        this.completed = false;
        this.reporter = new Reporter(this.config.apiKey);
        this.slsDebugger = slsDebugger;
        this.wrappedContext = {
            ...context,
            done: (error: any, result: any) => {
                ThundraLogger.debug(
                    '<LambdaHandlerWrapper> Called "done" over Lambda context with',
                    'error:', error, 'and result:', result);
                return this.completeInvocation(error, result);
            },
            succeed: (result: any) => {
                ThundraLogger.debug(
                    '<LambdaHandlerWrapper> Called "succeed" over Lambda context with result:', result);
                return this.completeInvocation(null, result);
            },
            fail: (error: any) => {
                ThundraLogger.debug(
                    '<LambdaHandlerWrapper> Called "fail" over Lambda context with error:', error);
                return this.completeInvocation(error, null);
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
    }

    // Invocation related stuff                                                                         //
    //////////////////////////////////////////////////////////////////////////////////////////////////////

    /**
     * Invokes wrapper handler which delegates to wrapped original handler
     * @return {Promise} the {@link Promise} to track the invocation
     */
    async invoke() {
        ThundraLogger.debug('<LambdaHandlerWrapper> Invoking wrapper ...');

        this.config.refreshConfig();

        if (this.slsDebugger) {
            await this.slsDebugger.start();
        }

        this.resolve = undefined;
        this.reject = undefined;

        const execContext = ExecutionContextManager.get();

        const coldStart: boolean = LambdaUtils.isColdStart(this.pluginContext);
        const currentTimestamp: number = Date.now();
        const sstLocal: boolean = LambdaUtils.isRunningOnLocalWithSST();
        let startTimestamp: number = currentTimestamp;
        // We skip taking care of initialization time for SST local (live Lambda development),
        // because SST local reloads local function without creating new process by workers.
        if (coldStart && !sstLocal) {
            const upTime: number = Math.floor(1000 * process.uptime());
            // At coldstart, start the invocation from the process start time to cover init duration
            startTimestamp = currentTimestamp - upTime;
        }

        // Execution context initialization
        execContext.startTimestamp = startTimestamp;
        execContext.request = this.originalEvent;
        execContext.platformData.originalContext = this.originalContext;
        execContext.platformData.originalEvent = this.originalEvent;

        const promise: Promise<any> = new Promise((resolve, reject) => {
            this.resolve = resolve;
            this.reject = reject;
            this.executeHook('before-invocation', execContext, false)
                .then(() => {
                    this.pluginContext.requestCount += 1;
                    this.timeout = this.setupTimeoutHandler();
                    try {
                        if (ThundraLogger.isDebugEnabled()) {
                            ThundraLogger.debug(
                                '<LambdaHandlerWrapper> Calling original function with the following arguments:', {
                                event: this.originalEvent,
                                context: this.wrappedContext,
                            });
                        }
                        const result = this.originalFunction.call(
                            this.originalThis,
                            this.originalEvent,
                            this.wrappedContext,
                            this.wrappedCallback,
                        );
                        if (ThundraLogger.isDebugEnabled()) {
                            ThundraLogger.debug(
                                '<LambdaHandlerWrapper> Received result of original function call:', result);
                        }
                        if (result && result.then !== undefined && typeof result.then === 'function') {
                            result.then(this.wrappedContext.succeed, this.wrappedContext.fail);
                        }
                    } catch (error) {
                        this.completeInvocation(error, null, null);
                    }
                })
                .catch((error) => {
                    ThundraLogger.error(
                        '<LambdaHandlerWrapper> Error occurred while executing "before-invocation" hooks:', error);
                    if (ThundraLogger.isDebugEnabled()) {
                        ThundraLogger.debug(
                            '<LambdaHandlerWrapper> Since Lambda wrapper failed, \
                            calling original function directly with the following arguments:', {
                            event: this.originalEvent,
                            context: this.originalContext,
                        });
                    }
                    try {
                        // There is an error on "before-invocation" phase
                        // So skip Thundra wrapping and call original function directly
                        const result = this.originalFunction.call(
                            this.originalThis,
                            this.originalEvent,
                            this.originalContext,
                            this.originalCallback,
                        );
                        if (ThundraLogger.isDebugEnabled()) {
                            ThundraLogger.debug(
                                '<LambdaHandlerWrapper> Received result of direct original function call:', result);
                        }
                        resolve(result);
                    } catch (error) {
                        if (ThundraLogger.isDebugEnabled()) {
                            ThundraLogger.debug(
                                '<LambdaHandlerWrapper> Failed direct original function call:', error);
                            reject(error);
                        }
                    }
                });
        });
        return promise;
    }

    private wrappedCallback = (error: any, result: any) => {
        ThundraLogger.debug(
            '<LambdaHandlerWrapper> Called Lambda callback with',
            'error:', error, 'and result:', result);
        return this.completeInvocation(error, result);
    }

    private async completeInvocation(error: any, result: any, timeout: boolean = false) {
        if (!this.completed) {
            try {
                ThundraLogger.debug('<LambdaHandlerWrapper> Completing invocation with error:', error, 'and result:', result);

                this.completed = true;

                const execContext = ExecutionContextManager.get();
                execContext.response = result;
                execContext.error = error;

                if (this.isHTTPErrorResponse(result)) {
                    ThundraLogger.debug('<LambdaHandlerWrapper> Detected HTTP error from result:', result);
                    execContext.error = new HttpError('Lambda returned with error response.');
                }

                this.destroyTimeoutHandler();

                try {
                    await this.executeAfterInvocationAndReport(timeout);
                } catch (e) {
                    ThundraLogger.debug('<LambdaHandlerWrapper> Failed to report:', e);
                }

                if (this.slsDebugger) {
                    this.slsDebugger.close();
                }
            } finally {
                if (!timeout) {
                    this.onFinish(error, result);
                }
            }
        } else {
            ThundraLogger.debug('<LambdaHandlerWrapper> Already completed');
        }
    }

    private async executeHook(hook: string, execContext: ExecutionContext, reverse: boolean) {
        if (ThundraLogger.isDebugEnabled()) {
            ThundraLogger.debug(
                '<LambdaHandlerWrapper> Executing hook', hook,
                'with execution context:', execContext.summary());
        }

        this.plugins.sort((p1: any, p2: any) => p1.pluginOrder > p2.pluginOrder ? 1 : -1);

        if (reverse) {
            this.plugins.reverse();
        }

        await Promise.all(
            this.plugins.map((plugin: any) => {
                if (plugin.hooks && plugin.hooks[hook]) {
                    return plugin.hooks[hook](execContext);
                }
            }),
        );
    }

    private async executeAfterInvocationAndReport(disableTrim: boolean = false) {
        ThundraLogger.debug('<LambdaHandlerWrapper> Execute after invocation and report');

        if (this.config.disableMonitoring) {
            return;
        }

        const execContext = ExecutionContextManager.get();

        execContext.finishTimestamp = Date.now();

        await this.executeHook('after-invocation', execContext, true);

        ThundraLogger.debug('<LambdaHandlerWrapper> Sending reports');

        if (!execContext.reportingDisabled) {
            await this.reporter.sendReports(execContext.reports, disableTrim);
        } else {
            ThundraLogger.debug('<LambdaHandlerWrapper> Skipped reporting as reporting is disabled');
        }
    }

    private isHTTPErrorResponse(result: any) {
        let isError = false;
        if (Utils.isValidHTTPResponse(result) && result.body) {
            if (typeof result.body === 'string') {
                if (HTTPUtils.isErrorFreeStatusCode(result.statusCode)) {
                    return false;
                }

                const statusCodeGroup = Math.floor(result.statusCode / 100);
                if (statusCodeGroup === 4) {
                    isError = !this.config.traceConfig.disableHttp4xxError;
                } else if (statusCodeGroup === 5) {
                    isError = !this.config.traceConfig.disableHttp5xxError;
                }
            } else {
                isError = true;
            }
        }
        return isError;
    }

    private onFinish(error: any, result: any): void {
        if (error && this.reject) {
            ThundraLogger.debug('<LambdaHandlerWrapper> Rejecting returned promise with error:', error);
            this.reject(error);
        } else if (this.resolve) {
            ThundraLogger.debug('<LambdaHandlerWrapper> Resolving returned promise with result:', result);
            this.resolve(result);
        }
    }

    //////////////////////////////////////////////////////////////////////////////////////////////////////

    // Timeout related stuff                                                                            //
    //////////////////////////////////////////////////////////////////////////////////////////////////////

    private setupTimeoutHandler(): NodeJS.Timer | undefined {
        ThundraLogger.debug('<LambdaHandlerWrapper> Setting up timeout handler');

        this.destroyTimeoutHandler();

        const { getRemainingTimeInMillis = () => 0 } = this.originalContext;

        if (this.pluginContext.timeoutMargin < 1 || getRemainingTimeInMillis() < 10) {
            return undefined;
        }
        const maxEndTime = 899900;
        const configEndTime = Math.max(
            0,
            getRemainingTimeInMillis() - this.pluginContext.timeoutMargin,
        );

        const endTime = Math.min(configEndTime, maxEndTime);

        ThundraLogger.debug(`<LambdaHandlerWrapper> Setting timeout to ${endTime} milliseconds later`);

        return setTimeout(() => {
            ThundraLogger.debug('<LambdaHandlerWrapper> Detected timeout');
            if (this.slsDebugger) {
                this.slsDebugger.kill();
            }
            ThundraLogger.debug('<LambdaHandlerWrapper> Reporting timeout error');
            return this.completeInvocation(new TimeoutError('Lambda is timed out.'), null, true);
        }, endTime);
    }

    private destroyTimeoutHandler() {
        ThundraLogger.debug('<LambdaHandlerWrapper> Destroying timeout handler');
        if (this.timeout) {
            ThundraLogger.debug('<LambdaHandlerWrapper> Clearing timeout handler');
            clearTimeout(this.timeout);
            this.timeout = null;
        }
    }

    //////////////////////////////////////////////////////////////////////////////////////////////////////

}

export default LambdaHandlerWrapper;
