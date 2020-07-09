import Utils from './utils/Utils';
import LogConfig from './config/LogConfig';
import LogData from './data/log/LogData';
import PluginContext from './PluginContext';
import MonitoringDataType from './data/base/MonitoringDataType';
import { ConsoleShimmedMethods, logLevels, StdOutLogContext, StdErrorLogContext } from '../Constants';
import * as util from 'util';
import ThundraLogger from '../ThundraLogger';
import InvocationSupport from './support/InvocationSupport';
import ConfigProvider from '../config/ConfigProvider';
import ConfigNames from '../config/ConfigNames';
import {ApplicationManager} from '../application/ApplicationManager';
import InvocationTraceSupport from './support/InvocationTraceSupport';
import Logger from './Logger';
import LogManager from './LogManager';
import Reporter from '../Reporter';

const get = require('lodash.get');

class Log {
    enabled: boolean;
    logData: LogData;
    hooks: { 'before-invocation': (pluginContext: PluginContext) => void;
             'after-invocation': (pluginContext: PluginContext) => void; };
    logs: LogData[];
    pluginOrder: number = 4;
    consoleReference: any = console;
    config: LogConfig;
    captureLog = false;
    logLevelFilter: number = 0;

    constructor(options?: LogConfig) {
        LogManager.addListener(this);

        this.hooks = {
            'before-invocation': this.beforeInvocation,
            'after-invocation': this.afterInvocation,
        };
        this.enabled = get(options, 'enabled', true);
        this.config = options;
        this.logs = [];

        const levelConfig = ConfigProvider.get<string>(ConfigNames.THUNDRA_LOG_LOGLEVEL);
        this.logLevelFilter = levelConfig && logLevels[levelConfig] ? logLevels[levelConfig] : 0;

        if (!ConfigProvider.get<boolean>(ConfigNames.THUNDRA_LOG_CONSOLE_DISABLE)) {
            this.shimConsole();
        }
    }

    report(logReport: any, reporter: Reporter): void {
        if (reporter) {
            reporter.addReport(logReport);
        }
    }

    beforeInvocation = (pluginContext: PluginContext) => {
        this.captureLog = true;
        this.logs = [];
        this.logData = Utils.initMonitoringData(pluginContext, MonitoringDataType.LOG) as LogData;

        this.logData.transactionId = pluginContext.transactionId ?
            pluginContext.transactionId : ApplicationManager.getPlatformUtils().getTransactionId();
        this.logData.traceId = pluginContext.traceId;

        this.logData.tags = {};
    }

    afterInvocation = (pluginContext: PluginContext) => {
        const sampler = get(this.config, 'sampler', { isSampled: () => true });
        const sampled = sampler.isSampled();
        if (sampled) {
            for (const log of this.logs) {
                const { apiKey, reporter } = pluginContext;
                const logReportData = Utils.generateReport(log, apiKey);
                // If lambda fails skip log filtering
                if (InvocationSupport.isErrorenous()) {
                    this.report(logReportData, reporter);
                    continue;
                }

                if (logLevels[log.logLevel] >= this.logLevelFilter) {
                    this.report(logReportData, reporter);
                }
            }
        } else {
            ThundraLogger.debug('Skipping reporting logs due to sampling.');
        }

        this.captureLog = false;
    }

    reportLog(logInfo: any): void {
        if (!this.enabled) {
            return;
        }
        const logData = new LogData();
        const activeSpan = InvocationTraceSupport.getActiveSpan();
        const spanId = activeSpan ? activeSpan.spanContext.spanId : '';
        logData.initWithLogDataValues(this.logData, spanId, logInfo);
        this.logs.push(logData);
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
                    if (this.captureLog) {
                        if (logLevel >= this.logLevelFilter) {
                            const logInfo = {
                                logMessage: util.format.apply(util, args),
                                logLevel: logLevelName,
                                logLevelCode: method === 'log' ? 2 : logLevels[method],
                                logContextName: method === 'error' ? StdErrorLogContext : StdOutLogContext,
                                logTimestamp: Date.now(),
                            };
                            this.reportLog(logInfo);
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
