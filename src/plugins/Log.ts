import Utils from './utils/Utils';
import LogConfig from './config/LogConfig';
import LogData from './data/log/LogData';
import PluginContext from './PluginContext';
import MonitoringDataType from './data/base/MonitoringDataType';
import ThundraTracer from '../opentracing/Tracer';
import { ConsoleShimmedMethods, logLevels, StdOutLogContext, envVariableKeys, StdErrorLogContext } from '../Constants';
import * as util from 'util';
import ThundraLogger from '../ThundraLogger';

class Log {
    static instance: Log;

    options: LogConfig;
    reporter: any;
    pluginContext: PluginContext;
    apiKey: any;
    logData: LogData;
    hooks: { 'before-invocation': (data: any) => void; 'after-invocation': (data: any) => void; };
    logs: LogData[];
    tracer: ThundraTracer;
    pluginOrder: number = 4;
    consoleReference: any = console;
    config: LogConfig;

    constructor(options: LogConfig) {
        this.hooks = {
            'before-invocation': this.beforeInvocation,
            'after-invocation': this.afterInvocation,
        };
        this.options = options;
        this.tracer = ThundraTracer.getInstance();

        Log.instance = this;
        this.config = options;
    }

    static getInstance(): Log {
        return Log.instance;
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
        this.logs = [];
        this.reporter = data.reporter;
        this.logData = Utils.initMonitoringData(this.pluginContext, MonitoringDataType.LOG) as LogData;

        this.logData.transactionId = this.pluginContext.transactionId ?
            this.pluginContext.transactionId : data.originalContext.awsRequestId;
        this.logData.traceId = this.pluginContext.traceId;

        this.logData.tags = {};

        if (Utils.getConfiguration(envVariableKeys.THUNDRA_LAMBDA_LOG_CONSOLE_DISABLE) !== 'true') {
            this.shimConsole();
        }
    }

    afterInvocation = (data: any) => {
        const sampled = (this.config && this.config.samplerConfig) ?
                    this.config.samplerConfig.isSampled() : true;

        if (sampled) {
            for (const log of this.logs) {
                const logReportData = Utils.generateReport(log, this.apiKey);
                this.report(logReportData);
            }
        } else {
            ThundraLogger.getInstance().debug('Skipping reporting logs due to sampling.');
        }

        this.destroy();
    }

    reportLog(logInfo: any): void {
        const logData = new LogData();
        const activeSpan = this.tracer ? this.tracer.getActiveSpan() : undefined;
        const spanId = activeSpan ? activeSpan.spanContext.spanId : '';
        logData.initWithLogDataValues(this.logData, spanId, logInfo);

        this.logs.push(logData);
    }

    shimConsole(): void {
        ConsoleShimmedMethods.forEach((method) => {
            if (this.consoleReference[method]) {
                const originalConsoleMethod = this.consoleReference[method].bind(console);

                const descriptor = Object.getOwnPropertyDescriptor(console, method);

                if (descriptor) {
                    Object.defineProperty(console, `original_${method}`, descriptor);
                }

                this.consoleReference[method] = (...args: any[]) => {
                    const logLevel = method.toUpperCase() === 'LOG' ? 'INFO' : method.toUpperCase();

                    const levelConfig = Utils.getConfiguration(envVariableKeys.THUNDRA_LAMBDA_LOG_LOGLEVEL);
                    const logLevelFilter = levelConfig && logLevels[levelConfig] ? logLevels[levelConfig] : 0;

                    if (logLevels[logLevel] >= logLevelFilter ) {
                        const logInfo = {
                            logMessage: util.format.apply(util, args),
                            logLevel,
                            logLevelCode: method === 'log' ? 2 : logLevels[method],
                            logContextName: method === 'error' ? StdErrorLogContext : StdOutLogContext,
                            logTimestamp: Date.now(),
                        };
                        this.reportLog(logInfo);
                    }

                    originalConsoleMethod.apply(console, args);
                };
            }

        });
    }

    unShimConsole(): void {
        ConsoleShimmedMethods.forEach((method) => {
            const descriptor = Object.getOwnPropertyDescriptor(console, `original_${method}`);
            if (descriptor) {
                Object.defineProperty(console, method, descriptor);
            }
        });
    }

    destroy(): void {
        if (Utils.getConfiguration(envVariableKeys.THUNDRA_LAMBDA_LOG_CONSOLE_DISABLE) !== 'true') {
            this.unShimConsole();
        }
    }
}

export default Log;
