import Utils from './utils/Utils';
import LogConfig from './config/LogConfig';
import LogData from './data/log/LogData';
import PluginContext from './PluginContext';
import MonitoringDataType from './data/base/MonitoringDataType';
import { ConsoleShimmedMethods, logLevels, StdOutLogContext, StdErrorLogContext } from '../Constants';
import * as util from 'util';
import ExecutionContextManager from '../context/ExecutionContextManager';
import ThundraLogger from '../ThundraLogger';
import InvocationSupport from './support/InvocationSupport';
import ConfigProvider from '../config/ConfigProvider';
import ConfigNames from '../config/ConfigNames';
import InvocationTraceSupport from './support/InvocationTraceSupport';
import LogManager from './LogManager';
import ExecutionContext from '../context/ExecutionContext';

const get = require('lodash.get');

class Log {
    enabled: boolean;
    hooks: { 'before-invocation': (execContext: ExecutionContext) => void;
             'after-invocation': (execContext: ExecutionContext) => void; };
    pluginOrder: number = 4;
    pluginContext: PluginContext;
    consoleReference: any = console;
    config: LogConfig;
    logLevelFilter: number = 0;
    baseLogData: LogData;

    constructor(options?: LogConfig) {
        LogManager.addListener(this);

        this.hooks = {
            'before-invocation': this.beforeInvocation,
            'after-invocation': this.afterInvocation,
        };
        this.enabled = get(options, 'enabled', true);
        this.config = options;

        const levelConfig = ConfigProvider.get<string>(ConfigNames.THUNDRA_LOG_LOGLEVEL);
        this.logLevelFilter = levelConfig && logLevels[levelConfig] ? logLevels[levelConfig] : 0;

        if (!ConfigProvider.get<boolean>(ConfigNames.THUNDRA_LOG_CONSOLE_DISABLE)) {
            this.shimConsole();
        }
    }

    setPluginContext = (pluginContext: PluginContext) => {
        this.pluginContext = pluginContext;
        this.baseLogData = Utils.initMonitoringData(this.pluginContext, MonitoringDataType.LOG) as LogData;
    }

    beforeInvocation = (execContext: ExecutionContext) => {
        // pass
    }

    afterInvocation = (execContext: ExecutionContext) => {
        const sampler = get(this.config, 'sampler', { isSampled: () => true });
        const sampled = sampler.isSampled();
        if (sampled) {
            const { logs } = execContext;
            for (const log of logs) {
                const { apiKey } = this.pluginContext;
                const logReportData = Utils.generateReport(log, apiKey);
                // If lambda fails skip log filtering
                if (InvocationSupport.isErrorenous()) {
                    execContext.report(logReportData);
                    continue;
                }

                if (logLevels[log.logLevel] >= this.logLevelFilter) {
                    execContext.report(logReportData);
                }
            }
        } else {
            ThundraLogger.debug('Skipping reporting logs due to sampling.');
        }

        execContext.captureLog = false;
    }

    reportLog(logInfo: any, execContext: ExecutionContext): void {
        if (!this.enabled) {
            return;
        }
        const logData = new LogData();
        const activeSpan = InvocationTraceSupport.getActiveSpan();
        const spanId = activeSpan ? activeSpan.spanContext.spanId : '';
        const { traceId, transactionId } = execContext;
        logData.initWithLogDataValues(this.baseLogData, spanId, transactionId, traceId, logInfo);
        execContext.logs.push(logData);
    }

    shimConsole(): void {
        ConsoleShimmedMethods.forEach((method) => {
            if (this.consoleReference[method]) {
                const logLevelName = method.toUpperCase() === 'LOG' ? 'INFO' : method.toUpperCase();
                const logLevel = logLevels[logLevelName] ? logLevels[logLevelName] : 0;
                const originalConsoleMethod = this.consoleReference[method].bind(console);
                const descriptor = Object.getOwnPropertyDescriptor(console, method);

                if (descriptor) {
                    Object.defineProperty(console, `original_${method}`, descriptor);
                }

                this.consoleReference[method] = (...args: any[]) => {
                    const execContext = ExecutionContextManager.get();

                    if (execContext && execContext.captureLog) {
                        if (logLevel >= this.logLevelFilter) {
                            const logInfo = {
                                logMessage: util.format.apply(util, args),
                                logLevel: logLevelName,
                                logLevelCode: method === 'log' ? 2 : logLevels[method],
                                logContextName: method === 'error' ? StdErrorLogContext : StdOutLogContext,
                                logTimestamp: Date.now(),
                            };
                            this.reportLog(logInfo, execContext);
                        }
                    }
                    originalConsoleMethod.apply(console, args);
                };
            }
        });
    }

    enable(): void {
        this.enabled = true;
    }

    disable(): void {
        this.enabled = false;
    }

    // tslint:disable-next-line:no-empty
    destroy(): void {}
}

export default Log;
