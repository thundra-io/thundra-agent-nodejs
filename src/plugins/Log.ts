import Utils from './Utils';
import LogConfig from './config/LogConfig';
import LogData from './data/log/LogData';
import PluginContext from './PluginContext';
import MonitoringDataType from './data/base/MonitoringDataType';
import ThundraTracer from '../opentracing/Tracer';

class Log {
    options: LogConfig;
    reporter: any;
    pluginContext: PluginContext;
    apiKey: any;
    originalContext: any;
    logData: LogData;
    hooks: { 'before-invocation': (data: any) => void; 'after-invocation': (data: any) => void; };
    logs: LogData[];
    tracer: ThundraTracer;
    pluginOrder: number = 3;

    constructor(options: LogConfig) {
        this.hooks = {
            'before-invocation': this.beforeInvocation,
            'after-invocation': this.afterInvocation,
        };
        this.options = options;
        this.tracer = ThundraTracer.getInstance();
    }

    report = (logReport: any) => {
        if (this.reporter) {
            this.reporter.addReport(logReport);
        }
    }

    setPluginContext = (pluginContext: PluginContext) => {
        this.pluginContext = pluginContext;
        this.apiKey = pluginContext.apiKey;
    }

    beforeInvocation = (data: any) => {
        this.logs = [];
        this.reporter = data.reporter;
        this.originalContext = data.originalContext;
        this.logData = Utils.initMonitoringData(this.pluginContext,
            this.originalContext, MonitoringDataType.LOG) as LogData;

        this.logData.transactionId = this.pluginContext.transactionId ?
            this.pluginContext.transactionId : this.originalContext.awsRequestId;
        this.logData.traceId = this.pluginContext.traceId;

        this.logData.tags = {};
        this.logData.tags['aws.region'] = this.pluginContext.applicationRegion;
        this.logData.tags['aws.lambda.name'] = this.originalContext.functionName;
        this.logData.tags['aws.lambda.arn'] = this.originalContext.invokedFunctionArn;
        this.logData.tags['aws.lambda.memory_limit'] = parseInt(this.originalContext.memoryLimitInMB, 10);
        this.logData.tags['aws.lambda.log_group_name'] = this.originalContext.logGroupName;
        this.logData.tags['aws.lambda.log_stream_name'] = this.originalContext.logStreamName;
        this.logData.tags['aws.lambda.invocation.request_id '] = this.originalContext.awsRequestId;
    }

    afterInvocation = (data: any) => {
        if (data.error) {
            const error = Utils.parseError(data.error);
            this.logData.tags['error.message'] = error.errorMessage;
            this.logData.tags['error.kind'] = error.errorType;
            this.logData.tags['error.stack'] = error.stack;
            if (error.code) {
                this.logData.tags['error.code'] = error.code;
            }
            if (error.stack) {
                this.logData.tags['error.stack'] = error.stack;
            }
        }

        for (const log of this.logs) {
            if (data.error) {
                log.addErrorTags(this.logData);
            }
            const logReportData = Utils.generateReport(log, this.apiKey);
            this.report(logReportData);
        }
    }

    reportLog = (logInfo: any) => {
        const logData = new LogData();
        const activeSpan = this.tracer.getActiveSpan();
        const spanId = activeSpan ? activeSpan.spanContext.spanId : '';
        logData.initWithLogDataValues(this.logData, spanId, logInfo);

        this.logs.push(logData);
    }
}

export default function instantiateLogPlugin(config: LogConfig) {
    return new Log(config);
}
