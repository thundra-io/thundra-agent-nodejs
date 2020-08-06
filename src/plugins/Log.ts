import Utils from '../utils/Utils';
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

/**
 * The log plugin for log support
 */
export default class Log {

    pluginOrder: number = 4;
    pluginContext: PluginContext;
    hooks: { 'before-invocation': (execContext: ExecutionContext) => void;
             'after-invocation': (execContext: ExecutionContext) => void; };
    enabled: boolean;
    consoleReference: any = console;
    config: LogConfig;
    logLevelFilter: number = 0;
    baseLogData: LogData;
    debugEnabled: boolean;

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

        this.debugEnabled = ThundraLogger.isDebugEnabled();

        if (!ConfigProvider.get<boolean>(ConfigNames.THUNDRA_LOG_CONSOLE_DISABLE)) {
            this.shimConsole();
        }
    }

    /**
     * Sets the the {@link PluginContext}
     * @param {PluginContext} pluginContext the {@link PluginContext}
     */
    setPluginContext = (pluginContext: PluginContext) => {
        this.pluginContext = pluginContext;
        this.baseLogData = Utils.initMonitoringData(this.pluginContext, MonitoringDataType.LOG) as LogData;
    }

    /**
     * Called before invocation
     * @param {ExecutionContext} execContext the {@link ExecutionContext}
     */
    beforeInvocation = (execContext: ExecutionContext) => {
        if (this.debugEnabled) {
            ThundraLogger.debug('<Log> Before invocation of transaction', execContext.transactionId);
        }

        execContext.captureLog = true;
    }

    /**
     * Called after invocation
     * @param {ExecutionContext} execContext the {@link ExecutionContext}
     */
    afterInvocation = (execContext: ExecutionContext) => {
        if (this.debugEnabled) {
            ThundraLogger.debug('<Log> After invocation of transaction', execContext.transactionId);
        }

        const sampler = get(this.config, 'sampler', { isSampled: () => true });
        const sampled = sampler.isSampled();
        const { logs } = execContext;

        if (this.debugEnabled) {
            ThundraLogger.debug('<Log> Checked sampling of transaction', execContext.transactionId, ':', sampled);
        }

        if (logs && sampled) {
            for (const log of logs) {
                const { apiKey } = this.pluginContext;
                const logReportData = Utils.generateReport(log, apiKey);
                // If lambda fails skip log filtering
                if (InvocationSupport.hasError()) {
                    ThundraLogger.debug('<Log> Reporting log because invocation is erroneous:', logReportData);
                    execContext.report(logReportData);
                    continue;
                }

                if (logLevels[log.logLevel] >= this.logLevelFilter) {
                    if (this.debugEnabled) {
                        ThundraLogger.debug('<Log> Reporting log:', logReportData);
                    }
                    execContext.report(logReportData);
                } else {
                    if (this.debugEnabled) {
                        ThundraLogger.debug('<Log> Skipped log because log level', log.logLevel,
                            'is lower than global log level threshold', this.logLevelFilter, ':',
                            logReportData);
                    }
                }
            }
        } else {
            ThundraLogger.debug('<Log> Skipping reporting logs due to sampling.');
        }

        execContext.captureLog = false;
    }

    /**
     * Destroys plugin
     */
    destroy(): void {
        // pass
    }

    /**
     * Reports log
     * @param logInfo the log data to be reported
     * @param {ExecutionContext} execContext the {@link ExecutionContext}
     * @param {boolean} fromConsole indicates whether the log is reported from shimmed console method
     */
    reportLog(logInfo: any, execContext: ExecutionContext, fromConsole: boolean = false): void {
        if (!this.enabled) {
            if (this.debugEnabled) {
                ThundraLogger.debug('<Log> Skipping reporting log because logging is disabled:', logInfo);
            }
            return;
        }
        if (!execContext) {
            execContext = ExecutionContextManager.get();
        }
        if (!execContext) {
            return;
        }
        const logData = new LogData();
        const activeSpan = InvocationTraceSupport.getActiveSpan();
        const spanId = activeSpan ? activeSpan.spanContext.spanId : '';
        const { traceId, transactionId } = execContext;
        logData.initWithLogDataValues(this.baseLogData, traceId, transactionId, spanId, logInfo);
        execContext.logs.push(logData);
        if (this.debugEnabled) {
            if (fromConsole) {
                ThundraLogger.debug('<Log> Captured log from console:', logData);
            } else {
                ThundraLogger.debug('<Log> Captured log:', logData);
            }
        }
    }

    private shimConsole(): void {
        ConsoleShimmedMethods.forEach((method) => {
            const consoleMethod = this.consoleReference[method];
            // If console method is valid and it is not patched by Thundra
            if (consoleMethod && !consoleMethod._thundra) {
                ThundraLogger.debug('<Log> Shimming console method:', method);

                const logLevelName = method.toUpperCase() === 'LOG' ? 'INFO' : method.toUpperCase();
                const logLevel = logLevels[logLevelName] ? logLevels[logLevelName] : 0;
                const originalConsoleMethod = this.consoleReference[method].bind(console);
                const descriptor = Object.getOwnPropertyDescriptor(console, method);

                if (descriptor) {
                    Object.defineProperty(console, `original_${method}`, descriptor);
                }

                const thundraConsoleMethod = (...args: any[]) => {
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
                            this.reportLog(logInfo, execContext, true);
                        } else {
                            if (this.debugEnabled) {
                                ThundraLogger.debug('<Log> Skipped log from console because log level', logLevel,
                                    'is lower than global log level threshold', this.logLevelFilter, ':', ...args);
                            }
                        }
                    }
                    originalConsoleMethod.apply(console, args);
                };
                // Mark Thundra console method to prevent double patching
                Object.defineProperty(thundraConsoleMethod, '_thundra', {
                    value: true,
                    writable: false,
                });
                this.consoleReference[method] = thundraConsoleMethod;
            }
        });
    }

}
