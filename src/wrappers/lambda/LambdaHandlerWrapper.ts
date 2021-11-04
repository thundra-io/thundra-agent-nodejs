import Reporter from '../../Reporter';
import TimeoutError from '../../error/TimeoutError';
import HttpError from '../../error/HttpError';
import ThundraConfig from '../../plugins/config/ThundraConfig';
import PluginContext from '../../plugins/PluginContext';
import ThundraLogger from '../../ThundraLogger';
import {
    BROKER_WS_HTTP_ERR_CODE_TO_MSG,
    BROKER_WS_HTTP_ERROR_PATTERN,
    BROKER_WS_PROTOCOL,
    BROKER_WSS_PROTOCOL,
    DEBUG_BRIDGE_FILE_NAME,
} from '../../Constants';
import Utils from '../../utils/Utils';
import { readFileSync } from 'fs';
import ConfigProvider from '../../config/ConfigProvider';
import ConfigNames from '../../config/ConfigNames';
import ExecutionContextManager from '../../context/ExecutionContextManager';
import ExecutionContext from '../../context/ExecutionContext';

const path = require('path');

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
    private reported: boolean;
    private reporter: Reporter;
    private wrappedContext: any;
    private timeout: NodeJS.Timer;
    private resolve: any;
    private reject: any;
    private inspector: any;
    private fork: any;
    private debuggerPort: number;
    private debuggerMaxWaitTime: number;
    private debuggerIOWaitTime: number;
    private brokerHost: string;
    private sessionName: string;
    private brokerProtocol: string;
    private authToken: string;
    private sessionTimeout: number;
    private brokerPort: number;
    private debuggerProxy: any;
    private debuggerLogsEnabled: boolean;

    constructor(self: any, event: any, context: any, callback: any, originalFunction: any,
                plugins: any, pluginContext: PluginContext, config: ThundraConfig) {
        this.originalThis = self;
        this.originalEvent = event;
        this.originalContext = context;
        this.originalCallback = callback;
        this.originalFunction = originalFunction;
        this.config = config || new ThundraConfig({ disableMonitoring: false });
        this.plugins = plugins;
        this.pluginContext = pluginContext;
        this.pluginContext.maxMemory = parseInt(context.memoryLimitInMB, 10);
        this.reported = false;
        this.reporter = new Reporter(this.config.apiKey);
        this.wrappedContext = {
            ...context,
            done: (error: any, result: any) => {
                return this.report(error, result, () => {
                    ThundraLogger.debug(
                        '<LambdaHandlerWrapper> Calling "done" over original Lambda context with',
                        'error:', error, 'and result:', result);
                    this.originalContext.done(error, result);
                });
            },
            succeed: (result: any) => {
                return this.report(null, result, () => {
                    ThundraLogger.debug(
                        '<LambdaHandlerWrapper> Calling "succeed" over original Lambda context with result:', result);
                    this.originalContext.succeed(result);
                });
            },
            fail: (error: any) => {
                return this.report(error, null, () => {
                    ThundraLogger.debug(
                        '<LambdaHandlerWrapper> Calling "fail" over original Lambda context with error:', error);
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

        if (this.shouldInitDebugger()) {
            this.initDebugger();
        }
    }

    /**
     * Invokes wrapper handler which delegates to wrapped original handler
     * @return {Promise} the {@link Promise} to track the invocation
     */
    async invoke() {
        ThundraLogger.debug('<LambdaHandlerWrapper> Invoking wrapper ...');

        this.config.refreshConfig();

        await this.startDebuggerProxyIfAvailable();

        this.resolve = undefined;
        this.reject = undefined;

        const execContext = ExecutionContextManager.get();

        // Execution context initialization
        execContext.startTimestamp = Date.now();
        execContext.platformData.originalContext = this.originalContext;
        execContext.platformData.originalEvent = this.originalEvent;

        return new Promise((resolve, reject) => {
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
                        this.report(error, null, null);
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
                });
        });
    }

    private wrappedCallback = (error: any, result: any) => {
        return this.report(error, result, () => {
            this.invokeCallback(error, result);
        });
    }

    private shouldInitDebugger(): boolean {
        const authToken = ConfigProvider.get<string>(ConfigNames.THUNDRA_LAMBDA_DEBUGGER_AUTH_TOKEN);
        const debuggerEnable = ConfigProvider.get<boolean>(ConfigNames.THUNDRA_LAMBDA_DEBUGGER_ENABLE, null);
        if (debuggerEnable != null) {
            return debuggerEnable && authToken !== undefined;
        } else {
            return authToken !== undefined;
        }
    }

    private invokeCallback(error: any, result: any): void {
        if (typeof this.originalCallback === 'function') {
            ThundraLogger.debug(
                '<LambdaHandlerWrapper> Calling original Lambda callback with',
                'error:', error, 'and result:', result);
            this.originalCallback(error, result);
        }
    }

    private onFinish(error: any, result: any): void {
        this.finishDebuggerProxyIfAvailable();
        if (error && this.reject) {
            ThundraLogger.debug('<LambdaHandlerWrapper> Rejecting returned promise with error:', error);
            this.reject(error);
        } else if (this.resolve) {
            ThundraLogger.debug('<LambdaHandlerWrapper> Resolving returned promise with result:', result);
            this.resolve(result);
        }
    }

    private initDebugger(): void {
        try {
            this.inspector = require('inspector');
            this.fork = require('child_process').fork;

            const debuggerPort =
                ConfigProvider.get<number>(ConfigNames.THUNDRA_LAMBDA_DEBUGGER_PORT);
            const brokerHost =
                ConfigProvider.get<string>(ConfigNames.THUNDRA_LAMBDA_DEBUGGER_BROKER_HOST);
            const brokerPort =
                ConfigProvider.get<number>(ConfigNames.THUNDRA_LAMBDA_DEBUGGER_BROKER_PORT);
            const authToken =
                ConfigProvider.get<string>(
                    ConfigNames.THUNDRA_LAMBDA_DEBUGGER_AUTH_TOKEN,
                    '');
            const sessionName =
                ConfigProvider.get<string>(ConfigNames.THUNDRA_LAMBDA_DEBUGGER_SESSION_NAME);
            const debuggerMaxWaitTime =
                ConfigProvider.get<number>(ConfigNames.THUNDRA_LAMBDA_DEBUGGER_WAIT_MAX);
            const debuggerIOWaitTime =
                ConfigProvider.get<number>(ConfigNames.THUNDRA_LAMBDA_DEBUGGER_IO_WAIT);
            const debuggerLogsEnabled =
                ConfigProvider.get<boolean>(ConfigNames.THUNDRA_LAMBDA_DEBUGGER_LOGS_ENABLE);
            let brokerProtocol = BROKER_WSS_PROTOCOL;

            if (brokerHost.startsWith(BROKER_WS_PROTOCOL) || brokerHost.startsWith(BROKER_WSS_PROTOCOL)) {
                // If WebSocket protocol is already included in the broker address, do not add protocol string
                brokerProtocol = '';
            }

            if (ThundraLogger.isDebugEnabled()) {
                ThundraLogger.debug('<LambdaHandlerWrapper> Initializing debugger with the following configurations:', {
                    debuggerPort, debuggerMaxWaitTime, debuggerIOWaitTime,
                    brokerProtocol, brokerHost, brokerPort,
                    sessionName, authToken, debuggerLogsEnabled,
                });
            }

            if (brokerPort === -1) {
                throw new Error(
                    'For debugging, you must set debug broker port through \
                    \'thundra_agent_lambda_debug_broker_port\' environment variable');
            }

            this.debuggerPort = debuggerPort;
            this.debuggerMaxWaitTime = debuggerMaxWaitTime;
            this.debuggerIOWaitTime = debuggerIOWaitTime;
            this.brokerProtocol = brokerProtocol;
            this.brokerPort = brokerPort;
            this.brokerHost = brokerHost;
            this.sessionName = sessionName;
            this.sessionTimeout = Date.now() + this.originalContext.getRemainingTimeInMillis();
            this.authToken = authToken;
            this.debuggerLogsEnabled = debuggerLogsEnabled;
        } catch (e) {
            this.fork = null;
            this.inspector = null;
        }
    }

    private getDebuggerProxyIOMetrics(): any {
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

    private async waitForDebugger() {
        let prevRchar = 0;
        let prevWchar = 0;
        let initCompleted = false;
        ThundraLogger.info('<LambdaHandlerWrapper> Waiting for debugger to handshake ...');

        const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

        const startTime = Date.now();
        while ((Date.now() - startTime) < this.debuggerMaxWaitTime) {
            try {
                const debuggerIoMetrics = this.getDebuggerProxyIOMetrics();
                if (ThundraLogger.isDebugEnabled()) {
                    ThundraLogger.debug(
                        '<LambdaHandlerWrapper> Got debugger proxy process IO metrics:', debuggerIoMetrics);
                }
                if (!debuggerIoMetrics) {
                    await sleep(this.debuggerIOWaitTime);
                    ThundraLogger.debug(
                        '<LambdaHandlerWrapper> No IO metrics was able to detected for debugger proxy process, \
                        finished waiting for handshake');
                    break;
                }
                if (ThundraLogger.isDebugEnabled()) {
                    ThundraLogger.debug('<LambdaHandlerWrapper> Checking debugger proxy process IO metrics:', {
                        prevRchar, prevWchar,
                        rchar: debuggerIoMetrics.rchar, wchar: debuggerIoMetrics.wchar,
                    });
                }
                if (prevRchar !== 0 && prevWchar !== 0 &&
                    debuggerIoMetrics.rchar === prevRchar && debuggerIoMetrics.wchar === prevWchar) {
                    ThundraLogger.debug(
                        '<LambdaHandlerWrapper> Debugger proxy process is idle since latest check, \
                        finished waiting for handshake');
                    initCompleted = true;
                    break;
                }
                prevRchar = debuggerIoMetrics.rchar;
                prevWchar = debuggerIoMetrics.wchar;
            } catch (e) {
                ThundraLogger.error(
                    '<LambdaHandlerWrapper> Error occurred while waiting debugger handshake to complete:', e);
                break;
            }
            await sleep(this.debuggerIOWaitTime);
        }
        if (initCompleted) {
            ThundraLogger.info('<LambdaHandlerWrapper> Completed debugger handshake');
        } else {
            ThundraLogger.error(
                '<LambdaHandlerWrapper> Couldn\'t complete debugger handshake in ' + this.debuggerMaxWaitTime + ' milliseconds.');
        }
    }

    private async startDebuggerProxyIfAvailable() {
        ThundraLogger.debug('<LambdaHandlerWrapper> Start debugger proxy if available');
        if (this.debuggerProxy) {
            this.finishDebuggerProxyIfAvailable();
        }
        if (this.fork && this.inspector) {
            try {
                ThundraLogger.debug('<LambdaHandlerWrapper> Forking debugger proxy process');
                this.debuggerProxy = this.fork(
                    path.join(__dirname, DEBUG_BRIDGE_FILE_NAME),
                    [],
                    {
                        detached: true,
                        env: {
                            BROKER_HOST: this.brokerHost,
                            BROKER_PORT: this.brokerPort,
                            SESSION_NAME: this.sessionName,
                            SESSION_TIMEOUT: this.sessionTimeout,
                            AUTH_TOKEN: this.authToken,
                            DEBUGGER_PORT: this.debuggerPort,
                            LOGS_ENABLED: this.debuggerLogsEnabled,
                            BROKER_PROTOCOL: this.brokerProtocol,
                        },
                    },
                );

                ThundraLogger.debug('<LambdaHandlerWrapper> Opening inspector');
                this.inspector.open(this.debuggerPort, 'localhost', false);

                const waitForBrokerConnection = () => new Promise((resolve) => {
                    this.debuggerProxy.once('message', (mes: any) => {
                        if (mes === 'brokerConnect') {
                            return resolve(false);
                        }

                        let errMessage: string;
                        if (typeof mes === 'string') {
                            const match = mes.match(BROKER_WS_HTTP_ERROR_PATTERN);

                            if (match) {
                                const errCode = Number(match[1]);
                                errMessage = BROKER_WS_HTTP_ERR_CODE_TO_MSG[errCode];
                            }
                        }

                        // If errMessage is undefined replace it with the raw incoming message
                        errMessage = errMessage || mes;
                        ThundraLogger.error(
                            '<LambdaHandlerWrapper> Received error message from Thundra Debugger:', errMessage);

                        return resolve(true);
                    });
                });

                ThundraLogger.debug('<LambdaHandlerWrapper> Waiting for broker connection ...');
                const brokerHasErr = await waitForBrokerConnection();

                if (brokerHasErr) {
                    ThundraLogger.debug('<LambdaHandlerWrapper> Failed waiting for broker connection');
                    this.finishDebuggerProxyIfAvailable();
                    return;
                }

                await this.waitForDebugger();
            } catch (e) {
                this.debuggerProxy = null;
                ThundraLogger.error('<LambdaHandlerWrapper> Error occurred while starting debugger proxy:', e);
            }
        }
    }

    private finishDebuggerProxyIfAvailable(): void {
        ThundraLogger.debug('<LambdaHandlerWrapper> Finish debugger proxy if available');
        try {
            if (this.inspector) {
                ThundraLogger.debug('<LambdaHandlerWrapper> Closing inspector');
                this.inspector.close();
                this.inspector = null;
            }
        } catch (e) {
            ThundraLogger.error(
                '<LambdaHandlerWrapper> Error occurred while finishing debugger proxy:', e);
        }
        if (this.debuggerProxy) {
            try {
                if (!this.debuggerProxy.killed) {
                    ThundraLogger.debug('<LambdaHandlerWrapper> Killing debugger proxy process');
                    this.debuggerProxy.kill();
                }
            } catch (e) {
                ThundraLogger.error(
                    '<LambdaHandlerWrapper> Error occurred while killing debugger proxy process:', e);
            } finally {
                this.debuggerProxy = null;
            }
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

    private async executeAfterInvocationAndReport() {
        ThundraLogger.debug('<LambdaHandlerWrapper> Execute after invocation and report');

        if (this.config.disableMonitoring) {
            return;
        }

        const execContext = ExecutionContextManager.get();

        execContext.finishTimestamp = Date.now();

        await this.executeHook('after-invocation', execContext, true);

        ThundraLogger.debug('<LambdaHandlerWrapper> Sending reports');

        if (!execContext.reportingDisabled) {
            await this.reporter.sendReports(execContext.reports);
        } else {
            ThundraLogger.debug('<LambdaHandlerWrapper> Skipped reporting as reporting is disabled');
        }
    }

    private async report(error: any, result: any, callback: any) {
        if (!this.reported) {
            ThundraLogger.debug('<LambdaHandlerWrapper> Reporting with error:', error, 'and result:', result);
            try {
                const execContext = ExecutionContextManager.get();
                execContext.response = result;
                execContext.error = error;

                if (this.isHTTPErrorResponse(result)) {
                    ThundraLogger.debug('<LambdaHandlerWrapper> Detected HTTP error from result:', result);
                    execContext.error = new HttpError('Lambda returned with error response.');
                }

                this.reported = true;
                this.destroyTimeoutHandler();

                try {
                    await this.executeAfterInvocationAndReport();
                } catch (e) {
                    ThundraLogger.debug('<LambdaHandlerWrapper> Failed to report:', e);
                }

                if (typeof callback === 'function') {
                    callback();
                }
            } finally {
                this.onFinish(error, result);
            }
        } else {
            ThundraLogger.debug('<LambdaHandlerWrapper> Skipped reporting as it is already reported');
        }
    }

    private isHTTPErrorResponse(result: any) {
        let isError = false;
        if (Utils.isValidHTTPResponse(result) && result.body) {
            if (typeof result.body === 'string') {
                const ignoredStatusCodesStr =
                    ConfigProvider.get<string>(ConfigNames.THUNDRA_AGENT_HTTP_ERROR_IGNORED_STATUS_CODES);
                if (ignoredStatusCodesStr) {
                    const ignoredStatusCodes = ignoredStatusCodesStr.replace(/\s/g, '').split(',');
                    if (ignoredStatusCodes && ignoredStatusCodes.includes(`${result.statusCode}`)) {
                        return false;
                    }
                }

                if (result.statusCode >= 400 && result.statusCode <= 599) {
                    isError = true;
                }
            } else {
                isError = true;
            }
        }
        return isError;
    }

    private destroyTimeoutHandler() {
        ThundraLogger.debug('<LambdaHandlerWrapper> Destroying timeout handler');
        if (this.timeout) {
            ThundraLogger.debug('<LambdaHandlerWrapper> Clearing timeout handler');
            clearTimeout(this.timeout);
            this.timeout = null;
        }
    }

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
            if (this.debuggerProxy) {
                // Debugger proxy exists, let it know about the timeout
                try {
                    if (!this.debuggerProxy.killed) {
                        ThundraLogger.debug('<LambdaHandlerWrapper> Killing debugger proxy process on timeout');
                        this.debuggerProxy.kill('SIGHUP');
                    }
                } catch (e) {
                    ThundraLogger.error('<LambdaHandlerWrapper> Error occurred while killing debugger proxy:', e);
                } finally {
                    this.debuggerProxy = null;
                }
            }
            ThundraLogger.debug('<LambdaHandlerWrapper> Reporting timeout error');
            this.report(new TimeoutError('Lambda is timed out.'), null, null);
        }, endTime);
    }

}

export default LambdaHandlerWrapper;
