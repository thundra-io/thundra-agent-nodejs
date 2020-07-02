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

const get = require('lodash.get');

class Log {
    reporter: any;
    enabled: boolean;
    pluginContext: PluginContext;
    apiKey: any;
    logData: LogData;
    hooks: { 'before-invocation': (data: any) => void; 'after-invocation': (data: any) => void; };
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

    report(logReport: any): void {
        if (this.reporter) {
            this.reporter.addReport(logReport);
        }
    }

    setPluginContext(pluginContext: PluginContext): void {
        this.pluginContext = pluginContext;
        this.apiKey = pluginContext.apiKey;
    }

    beforeInvocation = (data: any) => {
        this.captureLog = true;
        this.logs = [];
        this.reporter = data.reporter;
        this.logData = Utils.initMonitoringData(this.pluginContext, MonitoringDataType.LOG) as LogData;

        this.logData.transactionId = this.pluginContext.transactionId ?
            this.pluginContext.transactionId : ApplicationManager.getPlatformUtils().getTransactionId();
        this.logData.traceId = this.pluginContext.traceId;

        this.logData.tags = {};
    }

    afterInvocation = (data: any) => {
        const sampler = get(this.config, 'sampler', { isSampled: () => true });
        const sampled = sampler.isSampled();
        if (sampled) {
            for (const log of this.logs) {
                const logReportData = Utils.generateReport(log, this.apiKey);
                // If lambda fails skip log filtering
                if (InvocationSupport.isErrorenous()) {
                    this.report(logReportData);
                    continue;
                }

                if (logLevels[log.logLevel] >= this.logLevelFilter) {
                    this.report(logReportData);
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
