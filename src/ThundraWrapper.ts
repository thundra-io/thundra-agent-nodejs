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
* not enabled (environment variable thundra_lambda_report_cloudwatch_enable is not set). After reporting it calls
* original callback/succeed/done/fail.
*
*/

import Reporter from './Reporter';
import TimeoutError from './plugins/error/TimeoutError';
import HttpError from './plugins/error/HttpError';
import ThundraConfig from './plugins/config/ThundraConfig';
import PluginContext from './plugins/PluginContext';
import ThundraLogger from './ThundraLogger';
import InvocationSupport from './plugins/support/InvocationSupport';
import {
    envVariableKeys,
    DEFAULT_THUNDRA_AGENT_LAMBDA_DEBUGGER_PORT,
    DEFAULT_THUNDRA_AGENT_LAMBDA_DEBUGGER_HOST,
} from './Constants';
import Utils from './plugins/utils/Utils';
import { readFileSync, existsSync } from 'fs';

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
    private resolve: any;
    private reject: any;
    private inspector: any;
    private spawn: any;
    private debuggerPort: number;
    private debuggerMaxWaitTime: number;
    private brokerHost: string;
    private brokerPort: number;
    private debuggerProxy: any;

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
        InvocationSupport.setFunctionName(this.originalContext.functionName);

        if (Utils.getConfiguration(envVariableKeys.THUNDRA_AGENT_LAMBDA_DEBUGGER_ENABLE) === 'true') {
            this.initDebugger();
        }
    }

    wrappedCallback = (error: any, result: any) => {
        this.report(error, result, () => {
            this.invokeCallback(error, result);
        });
    }

    invokeCallback(error: any, result: any): void {
        if (typeof this.originalCallback === 'function') {
            this.originalCallback(error, result);
        }
    }

    onFinish(error: any, result: any): void {
        if (error && this.reject) {
            this.reject(error);
        } else if (this.resolve) {
            this.resolve(result);
        }
        this.finishDebuggerProxyIfAvailable();
    }

    initDebugger(): void {
        try {
            if (!existsSync('/opt/socat')) {
                throw new Error(
                    '"Socat" is not exist under "/opt/socat". \
                    Please be sure that "socat" layer is added or it is available under "/opt/socat"');
            }

            this.inspector = require('inspector');
            this.spawn = require('child_process').spawn;

            const debuggerPort =
                Utils.getNumericConfiguration(
                    envVariableKeys.THUNDRA_AGENT_LAMBDA_DEBUGGER_PORT,
                    DEFAULT_THUNDRA_AGENT_LAMBDA_DEBUGGER_PORT);
            const brokerHost =
                Utils.getConfiguration(
                    envVariableKeys.THUNDRA_AGENT_LAMBDA_DEBUGGER_BROKER_HOST,
                    DEFAULT_THUNDRA_AGENT_LAMBDA_DEBUGGER_HOST);
            const brokerPort =
                Utils.getNumericConfiguration(
                    envVariableKeys.THUNDRA_AGENT_LAMBDA_DEBUGGER_BROKER_PORT,
                    -1);
            const debuggerMaxWaitTime =
                Utils.getNumericConfiguration(
                    envVariableKeys.THUNDRA_AGENT_LAMBDA_DEBUGGER_WAIT_MAX,
                    60 * 1000);

            if (brokerPort === -1) {
                throw new Error(
                    'For debugging, you must set debug broker port through \
                    \'thundra_agent_lambda_debug_broker_port\' environment variable');
            }

            this.debuggerPort = debuggerPort;
            this.debuggerMaxWaitTime = debuggerMaxWaitTime;
            this.brokerPort = brokerPort;
            this.brokerHost = brokerHost;
        } catch (e) {
            this.spawn = null;
            this.inspector = null;
        }
    }

    getDebuggerProxyIOMetrics(): any {
        try {
            const ioContent = readFileSync('/proc/' + this.debuggerProxy.pid + '/io', 'utf8');
            const ioMetrics = ioContent.split('\n');
            return {
                rchar: ioMetrics[0],
                wchar: ioMetrics[1],
            };
        } catch (e) {
            return null;
        }
    }

    waitForDebugger(): void {
        const sleep = require('system-sleep');
        let prevRchar = 0;
        let prevWchar = 0;
        let initCompleted = false;
        const logger: ThundraLogger = ThundraLogger.getInstance();
        logger.info('Waiting for debugger to handshake ...');
        const startTime = Date.now();
        while ((Date.now() - startTime) < this.debuggerMaxWaitTime) {
            try {
                const debuggerIoMetrics = this.getDebuggerProxyIOMetrics();
                if (!debuggerIoMetrics) {
                    sleep(1000);
                    break;
                }
                if (prevRchar !== 0 && prevWchar !== 0 &&
                    debuggerIoMetrics.rchar === prevRchar && debuggerIoMetrics.wchar === prevWchar) {
                    initCompleted = true;
                    break;
                }
                prevRchar = debuggerIoMetrics.rchar;
                prevWchar = debuggerIoMetrics.wchar;
            } catch (e) {
                logger.error(e);
                break;
            }
            sleep(1000);
        }
        if (initCompleted) {
            logger.info('Completed debugger handshake');
        } else {
            logger.error('Couldn\'t complete debugger handshake in ' + this.debuggerMaxWaitTime + ' milliseconds.');
        }
    }

    startDebuggerProxyIfAvailable(): void {
        if (this.debuggerProxy) {
            this.finishDebuggerProxyIfAvailable();
        }
        if (this.spawn && this.inspector) {
            try {
                this.debuggerProxy =
                    this.spawn(
                        '/opt/socat',
                        [
                            'TCP:' + this.brokerHost + ':' + this.brokerPort,
                            'TCP:localhost:' + this.debuggerPort + ',forever',
                        ],
                        {detached: true});
                this.inspector.open(this.debuggerPort, 'localhost', true);
                this.waitForDebugger();
            } catch (e) {
                this.debuggerProxy = null;
                ThundraLogger.getInstance().error(e);
            }
        }
    }

    finishDebuggerProxyIfAvailable(): void {
        try {
            if (this.inspector) {
                this.inspector.close();
            }
        } catch (e) {
            ThundraLogger.getInstance().error(e);
        }
        if (this.debuggerProxy) {
            try {
                this.debuggerProxy.kill('SIGKILL');
            } catch (e) {
                ThundraLogger.getInstance().error(e);
            } finally {
                this.debuggerProxy = null;
            }
        }
    }

    invoke() {
        // Refresh config to check if config updated
        this.config.refreshConfig();
        this.startDebuggerProxyIfAvailable();

        const beforeInvocationData = {
            originalContext: this.originalContext,
            originalEvent: this.originalEvent,
            reporter: this.reporter,
        };

        this.resetTime();

        InvocationSupport.setErrorenous(false);

        this.resolve = undefined;
        this.reject = undefined;

        return new Promise((resolve, reject) => {
            this.resolve = resolve;
            this.reject = reject;
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
                        if (result && result.then !== undefined && typeof result.then === 'function') {
                            result.then(this.wrappedContext.succeed, this.wrappedContext.fail);
                        }
                    } catch (error) {
                        this.report(error, null, null);
                    }
                })
                .catch((error) => {
                    ThundraLogger.getInstance().debug(error);
                    // There is an error on "before-invocation" phase
                    // So skip Thundra wrapping and call original function directly
                    const result = this.originalFunction.call(
                        this.originalThis,
                        this.originalEvent,
                        this.originalContext,
                        this.originalCallback,
                    );
                    resolve(result);
                });
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
        afterInvocationData.error ? InvocationSupport.setErrorenous(true) : InvocationSupport.setErrorenous(false);

        await this.executeHook('after-invocation', afterInvocationData, true);
        this.resetTime();
        await this.reporter.sendReports();

        InvocationSupport.setErrorenous(false);
    }

    resetTime() {
        this.pluginContext.invocationStartTimestamp = undefined;
        this.pluginContext.invocationFinishTimestamp = undefined;
    }

    async report(error: any, result: any, callback: any) {
        if (!this.reported) {
            try {
                this.reported = true;

                let afterInvocationData = {
                    error,
                    originalEvent: this.originalEvent,
                    response: result,
                };

                if (this.isErrorResponse(result)) {
                    afterInvocationData = {
                        error: new HttpError('Lambda returned with error response.'),
                        originalEvent: this.originalEvent,
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
            } finally {
                this.onFinish(error, result);
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
