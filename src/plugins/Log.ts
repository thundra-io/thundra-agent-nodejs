import Utils from './utils/Utils';
import LogConfig from './config/LogConfig';
import LogData from './data/log/LogData';
import PluginContext from './PluginContext';
import MonitoringDataType from './data/base/MonitoringDataType';
import ThundraTracer from '../opentracing/Tracer';
import { ConsoleShimmedMethods, logLevels, StdOutLogContext, envVariableKeys, StdErrorLogContext } from '../Constants';
import * as util from 'util';
import ThundraLogger from '../ThundraLogger';
import InvocationSupport from './support/InvocationSupport';

class Log {
    static instance: Log;

    options: LogConfig;
    reporter: any;
    enabled: boolean;
    pluginContext: PluginContext;
    apiKey: any;
    logData: LogData;
    hooks: { 'before-invocation': (data: any) => void; 'after-invocation': (data: any) => void; };
    logs: LogData[];
    tracer: ThundraTracer;
    pluginOrder: number = 4;
    consoleReference: any = console;
    config: LogConfig;
    captureLog = false;

    constructor(options: LogConfig) {
        console.log('update thundra log ');

        this.hooks = {
            'before-invocation': this.beforeInvocation,
            'after-invocation': this.afterInvocation,
        };
        this.options = options;
        if (options) {
            this.tracer = options.tracer;
        }
        this.enabled = false;
        Log.instance = this;
        this.config = options;

        if (Utils.getConfiguration(envVariableKeys.THUNDRA_LAMBDA_LOG_CONSOLE_DISABLE) !== 'true') {
            this.shimConsole();
        }
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
        this.captureLog = true;
        this.logs = [];
        this.reporter = data.reporter;
        this.logData = Utils.initMonitoringData(this.pluginContext, MonitoringDataType.LOG) as LogData;

        this.logData.transactionId = this.pluginContext.transactionId ?
            this.pluginContext.transactionId : data.originalContext.awsRequestId;
        this.logData.traceId = this.pluginContext.traceId;

        this.logData.tags = {};
    }

    afterInvocation = (data: any) => {
        const isSamplerPresent = this.config && this.config.sampler && typeof (this.config.sampler.isSampled) === 'function';
        const sampled = isSamplerPresent ? this.config.sampler.isSampled() : true;
        if (sampled) {
            for (const log of this.logs) {
                const logReportData = Utils.generateReport(log, this.apiKey);
                // If lambda fails skip log filtering
                if (InvocationSupport.isErrorenous()) {
                    this.report(logReportData);
                    continue;
                }

                const levelConfig = Utils.getConfiguration(envVariableKeys.THUNDRA_LAMBDA_LOG_LOGLEVEL);
                const logLevelFilter = levelConfig && logLevels[levelConfig] ? logLevels[levelConfig] : 0;

                if (logLevels[log.logLevel] >= logLevelFilter) {
                    this.report(logReportData);
                }
            }
        } else {
            ThundraLogger.getInstance().debug('Skipping reporting logs due to sampling.');
        }

        this.captureLog = false;
        this.destroy();
    }

    reportLog(logInfo: any): void {
        if (!this.enabled) {
            return;
        }
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

                    const logInfo = {
                        logMessage: util.format.apply(util, args),
                        logLevel,
                        logLevelCode: method === 'log' ? 2 : logLevels[method],
                        logContextName: method === 'error' ? StdErrorLogContext : StdOutLogContext,
                        logTimestamp: Date.now(),
                    };

                    this.reportLog(logInfo);

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

    enable(): void {
        this.enabled = true;
    }

    disable(): void {
        this.enabled = false;
    }

    destroy(): void {
        /*if (Utils.getConfiguration(envVariableKeys.THUNDRA_LAMBDA_LOG_CONSOLE_DISABLE) !== 'true') {
            this.unShimConsole();
        }*/
    }
}

export default Log;
