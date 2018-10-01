/*
*
* Calculates duration of the lambda handler function.
*
* Generates trace report data.
*
* Adds the trace report to the Reporter instance if async monitoring is not enabled (environment variable
* thundra_lambda_publish_cloudwatch_enable is not set), otherwise it logs the report for async monitoring.
*
*/
// import AuditInfo from './data/trace/AuditInfo';;
import ThundraTracer from '../opentracing/Tracer';
import Utils from './Utils';
import TraceData from './data/trace/TraceData';
import { initGlobalTracer } from 'opentracing';
import HttpError from './error/HttpError';
import { INTEGRATIONS } from '../Constants';
import Reporter from '../Reporter';
import TraceConfig from './config/TraceConfig';
import Instrumenter from '../opentracing/instrument/Instrumenter';
import Integration from './integrations/Integration';
import MonitoringDataType from './data/base/MonitoringDataType';
import ThundraSpan from '../opentracing/Span';
import SpanData from './data/trace/SpanData';
import PluginContext from './PluginContext';
import TimeoutError from './error/TimeoutError';

export class Trace {
    hooks: { 'before-invocation': (data: any) => void; 'after-invocation': (data: any) => void; };
    config: TraceConfig;
    traceData: TraceData;
    reporter: Reporter;
    pluginContext: PluginContext;
    apiKey: string;
    finishTimestamp: number;
    startTimestamp: number;
    tracer: ThundraTracer;
    instrumenter: Instrumenter;
    integrations: Map<string, Integration>;
    rootSpan: ThundraSpan;

    constructor(config: TraceConfig) {
        this.hooks = {
            'before-invocation': this.beforeInvocation,
            'after-invocation': this.afterInvocation,
        };
        this.config = config;
        this.traceData = new TraceData();
        const tracerConfig = config ? config.tracerConfig : {};

        this.tracer = new ThundraTracer(tracerConfig);
        initGlobalTracer(this.tracer);

        this.instrumenter = new Instrumenter(this.tracer, config);
        this.instrumenter.hookModuleCompile();

        if (this.config && this.config.integrations) {
            this.integrations = new Map<string, Integration>();
            for (const integration of config.integrations) {
                const clazz = INTEGRATIONS[integration.name];
                if (clazz) {
                    if (!this.integrations.get(integration.name)) {
                        const instance = new clazz(this.tracer, integration.opt);
                        this.integrations.set(integration.name, instance);
                    }
                }
            }
        }
    }

    report(data: any): void {
        this.reporter.addReport(data);
    }

    setPluginContext = (pluginContext: PluginContext) => {
        this.pluginContext = pluginContext;
        this.apiKey = pluginContext.apiKey;
    }

    beforeInvocation = (data: any) => {
        const { originalContext, originalEvent, reporter } = data;

        this.rootSpan = this.tracer._startSpan(originalContext.functionName, {
            rootTraceId: this.pluginContext.traceId,
        });

        // awsRequestId can be `id` or undefined in local lambda environments, so we generate a unique id here.
        if (!originalContext.awsRequestId || originalContext.awsRequestId === 'id') {
            originalContext.awsRequestId = Utils.generateId();
        }

        this.pluginContext.transactionId = originalContext.awsRequestId;
        this.pluginContext.traceId = Utils.generateId();
        this.pluginContext.spanId = this.rootSpan.spanContext.spanId;

        this.reporter = reporter;
        this.startTimestamp = Date.now();

        this.traceData = Utils.initMonitoringData(this.pluginContext,
            originalContext, MonitoringDataType.TRACE) as TraceData;

        this.traceData.id = this.pluginContext.traceId;
        this.traceData.startTimestamp = Date.now();
        this.traceData.rootSpanId = this.rootSpan.spanContext.spanId;

        this.traceData.tags = {};
        this.traceData.tags['aws.region'] = this.pluginContext.applicationRegion;
        this.traceData.tags['aws.lambda.name'] = originalContext.functionName;
        this.traceData.tags['aws.lambda.memory_limit'] = parseInt(originalContext.memoryLimitInMB, 10);
        this.traceData.tags['aws.lambda.log_group_name'] = originalContext.logGroupName;
        this.traceData.tags['aws.lambda.arn'] = originalContext.invokedFunctionArn;
        this.traceData.tags['aws.lambda.invocation.coldstart'] = this.pluginContext.requestCount === 0;
        this.traceData.tags['aws.lambda.log_stream_name'] = originalContext.logStreamName;
        this.traceData.tags['aws.lambda.invocation.timeout'] = false;

        this.rootSpan.tags['aws.lambda.memory_limit'] = parseInt(originalContext.memoryLimitInMB, 10);
        this.rootSpan.tags['aws.lambda.arn'] = originalContext.invokedFunctionArn;
        this.rootSpan.tags['aws.lambda.invocation.coldstart'] = this.pluginContext.requestCount === 0;
        this.rootSpan.tags['aws.region'] = this.pluginContext.applicationRegion;
        this.rootSpan.tags['aws.lambda.log_group_name'] = originalContext.logGroupName;
        this.rootSpan.tags['aws.lambda.name'] = originalContext.functionName;
        this.rootSpan.tags['aws.lambda.log_stream_name'] = originalContext.logStreamName;
        this.rootSpan.tags['aws.lambda.invocation.request_id '] = originalContext.awsRequestId;
        this.rootSpan.tags['aws.lambda.invocation.coldstart'] = this.pluginContext.requestCount === 0;
        this.rootSpan.tags['aws.lambda.invocation.request'] = this.getRequest(originalEvent);
    }

    afterInvocation = (data: any) => {
        let response = data.response;
        if (data.error) {
            const error = Utils.parseError(data.error);
            if (!(data.error instanceof HttpError)) {
                response = error;
            }

            if (data.error instanceof TimeoutError) {
                this.traceData.tags['aws.lambda.invocation.timeout'] = true;
            }

            this.traceData.tags.error = true;
            this.traceData.tags['error.message'] = error.errorMessage;
            this.traceData.tags['error.kind'] = error.errorType;

            this.rootSpan.tags.error = true;
            this.rootSpan.tags['error.message'] = error.errorMessage;
            this.rootSpan.tags['error.kind'] = error.errorType;

            if (error.code) {
                this.traceData.tags['error.code'] = error.code;
                this.rootSpan.tags['error.code'] = error.code;
            }
            if (error.stack) {
                this.traceData.tags['error.stack'] = error.stack;
                this.rootSpan.tags['error.stack'] = error.stack;
            }
        }

        this.rootSpan.tags['aws.lambda.invocation.response'] = this.getResponse(response);

        this.finishTimestamp = Date.now();
        this.traceData.finishTimestamp = this.finishTimestamp;
        this.traceData.duration = this.finishTimestamp - this.startTimestamp;

        if (this.tracer.getActiveSpan()) {
            this.tracer.getActiveSpan().finish();
        }

        const reportData = Utils.generateReport(this.traceData, this.apiKey);
        this.report(reportData);

        const spanList = this.tracer.getRecorder().getSpanList();
        for (const span of spanList) {
            const spanData = this.buildSpanData(span, this.pluginContext);
            const spanReportData = Utils.generateReport(spanData, this.apiKey);
            this.report(spanReportData);
        }

        this.tracer.destroy();
        this.instrumenter.unhookModuleCompile();
    }

    buildSpanData(span: ThundraSpan, pluginContext: PluginContext): SpanData {
        const spanData = Utils.createMonitoringData(MonitoringDataType.SPAN) as SpanData;
        spanData.initWithBaseMonitoringDataValues(this.traceData);

        spanData.id = span.spanContext.spanId;
        spanData.traceId = pluginContext.traceId;
        spanData.transactionId = pluginContext.transactionId;
        spanData.parentSpanId = span.spanContext.parentId;
        spanData.spanOrder = span.order;
        spanData.domainName = span.domainName ? span.domainName : '';
        spanData.className = span.className ? span.className : '';
        spanData.serviceName = this.rootSpan.operationName;
        spanData.operationName = span.operationName;
        spanData.startTimestamp = span.startTime;
        spanData.finishTimestamp = span.startTime + span.duration;
        spanData.duration = span.duration;
        spanData.tags = span.tags;
        spanData.logs = span.logs;

        return spanData;
    }

    private getRequest(originalEvent: any): any {
        const conf = this.config;

        if (conf && conf.disableRequest) {
            return null;
        }

        if (conf && conf.maskRequest && typeof conf.maskRequest === 'function') {
            return conf.maskRequest.call(this, originalEvent);
        }

        return originalEvent;
    }

    private getResponse(response: any): any {
        const conf = this.config;

        if (conf && conf.disableResponse) {
            return null;
        }

        if (conf && conf.maskResponse && typeof conf.maskResponse === 'function') {
            return conf.maskResponse.call(this, response);
        }

        return response;
    }
}

export default function instantiateTracePlugin(config: TraceConfig) {
    return new Trace(config);
}
