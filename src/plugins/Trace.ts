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

import ThundraTracer from '../opentracing/Tracer';
import Utils from './utils/Utils';
import TraceData from './data/trace/TraceData';
import { initGlobalTracer } from 'opentracing';
import * as opentracing from 'opentracing';
import HttpError from './error/HttpError';
import Reporter from '../Reporter';
import TraceConfig from './config/TraceConfig';
import MonitoringDataType from './data/base/MonitoringDataType';
import ThundraSpan from '../opentracing/Span';
import SpanData from './data/trace/SpanData';
import PluginContext from './PluginContext';
import TimeoutError from './error/TimeoutError';
import { DomainNames, ClassNames, envVariableKeys } from '../Constants';
import ThundraSpanContext from '../opentracing/SpanContext';
import LambdaEventUtils, { LambdaEventType } from './utils/LambdaEventUtils';
import ThundraLogger from '../ThundraLogger';
import InvocationSupport from './support/InvocationSupport';

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
    rootSpan: ThundraSpan;
    pluginOrder: number = 1;

    constructor(config: TraceConfig) {
        this.hooks = {
            'before-invocation': this.beforeInvocation,
            'after-invocation': this.afterInvocation,
        };

        this.traceData = new TraceData();
        const tracerConfig = config ? config.tracerConfig : {};
        this.config = config;

        this.tracer = new ThundraTracer(tracerConfig);
        initGlobalTracer(this.tracer);
        Utils.registerSpanListenersFromConfigurations(this.tracer);
    }

    report(data: any): void {
        this.reporter.addReport(data);
    }

    setPluginContext = (pluginContext: PluginContext) => {
        this.pluginContext = pluginContext;
        this.apiKey = pluginContext.apiKey;
    }

    beforeInvocation = (data: any) => {
        this.destroy();

        const { originalContext, originalEvent, reporter } = data;

        // awsRequestId can be `id` or undefined in local lambda environments, so we generate a unique id here.
        if (!originalContext.awsRequestId || originalContext.awsRequestId === 'id') {
            originalContext.awsRequestId = Utils.generateId();
        }

        InvocationSupport.setFunctionName(originalContext.functionName);

        const propagatedSpanContext: ThundraSpanContext =
            this.extractSpanContext(originalEvent, originalContext) as ThundraSpanContext;

        if (propagatedSpanContext) {
            this.pluginContext.transactionId = Utils.getConfiguration(
                envVariableKeys.THUNDRA_LAMBDA_TRACE_USE_PROPAGATED_TRANSACTION_ID) === 'true' ?
                propagatedSpanContext.transactionId : originalContext.awsRequestId;

            this.pluginContext.traceId = propagatedSpanContext.traceId;
            this.tracer.transactionId = this.pluginContext.transactionId;

            this.rootSpan = this.tracer._startSpan(originalContext.functionName, {
                propagated: true,
                parentContext: propagatedSpanContext,
                rootTraceId: this.pluginContext.traceId,
                domainName: DomainNames.API,
                className: ClassNames.LAMBDA,
            });

        } else {
            this.tracer.transactionId = originalContext.awsRequestId;
            this.pluginContext.traceId = Utils.generateId();
            this.pluginContext.transactionId = this.tracer.transactionId;

            this.rootSpan = this.tracer._startSpan(originalContext.functionName, {
                rootTraceId: this.pluginContext.traceId,
                domainName: DomainNames.API,
                className: ClassNames.LAMBDA,
            });
        }

        this.pluginContext.spanId = this.rootSpan.spanContext.spanId;

        this.reporter = reporter;
        this.startTimestamp = this.pluginContext.invocationStartTimestamp;
        this.rootSpan.startTime = this.pluginContext.invocationStartTimestamp;

        this.traceData = Utils.initMonitoringData(this.pluginContext,
            originalContext, MonitoringDataType.TRACE) as TraceData;

        this.traceData.id = this.pluginContext.traceId;
        this.traceData.startTimestamp = this.pluginContext.invocationStartTimestamp;
        this.traceData.rootSpanId = this.rootSpan ? this.rootSpan.spanContext.spanId : '';

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
        this.rootSpan.tags['aws.lambda.invocation.request_id'] = originalContext.awsRequestId;
        this.rootSpan.tags['aws.lambda.invocation.coldstart'] = this.pluginContext.requestCount === 0;
        this.rootSpan.tags['aws.lambda.invocation.request'] = this.getRequest(originalEvent);

        this.injectTriggerTags(this.rootSpan, originalEvent, originalContext);
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

        this.finishTimestamp = this.pluginContext.invocationFinishTimestamp;
        this.traceData.finishTimestamp = this.finishTimestamp;
        this.traceData.duration = this.finishTimestamp - this.startTimestamp;
        this.rootSpan.finish();
        this.rootSpan.finishTime = this.pluginContext.invocationFinishTimestamp;

        const reportData = Utils.generateReport(this.traceData, this.apiKey);
        this.report(reportData);

        const spanList = this.tracer.getRecorder().getSpanList();
        const sampled = (this.config && this.config.samplerConfig) ? this.config.samplerConfig.isSampled(this.rootSpan) : true;
        if (sampled) {
            for (const span of spanList) {
                if (span) {
                    const spanData = this.buildSpanData(span, this.pluginContext);
                    const spanReportData = Utils.generateReport(spanData, this.apiKey);
                    this.report(spanReportData);
                }
            }
        }

        this.destroy();
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
        spanData.duration = span.getDuration();
        spanData.finishTimestamp = span.finishTime;
        spanData.tags = span.tags;
        spanData.logs = span.logs;

        return spanData;
    }

    destroy(): void {
        if (this.config && !(this.config.disableInstrumentation)) {
            this.tracer.destroy();
            if (typeof this.config.unhookModuleCompile === 'function') {
                this.config.unhookModuleCompile();
            }
        }
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

    private extractSpanContext(originalEvent: any, originalContext: any): opentracing.SpanContext {
        const lambdaEventType = LambdaEventUtils.getLambdaEventType(originalEvent, originalContext);
        if (lambdaEventType === LambdaEventType.Lambda) {
            return this.tracer.extract(opentracing.FORMAT_TEXT_MAP, originalContext.clientContext.custom);
        } else if (lambdaEventType === LambdaEventType.APIGatewayProxy) {
            return this.tracer.extract(opentracing.FORMAT_HTTP_HEADERS, originalEvent.headers);
        } else if (lambdaEventType === LambdaEventType.SNS) {
            return LambdaEventUtils.extractSpanContextFromSNSEvent(this.tracer, originalEvent);
        } else if (lambdaEventType === LambdaEventType.SQS) {
            return LambdaEventUtils.extractSpanContextFromSQSEvent(this.tracer, originalEvent);
        }
    }

    private injectTriggerTags(span: ThundraSpan, originalEvent: any, originalContext: any) {
        try {
            const lambdaEventType = LambdaEventUtils.getLambdaEventType(originalEvent, originalContext);

            if (lambdaEventType === LambdaEventType.Kinesis) {
                LambdaEventUtils.injectTriggerTagsForKinesis(span, originalEvent);
            } else if (lambdaEventType === LambdaEventType.FireHose) {
                LambdaEventUtils.injectTriggerTagsForFirehose(span, originalEvent);
            } else if (lambdaEventType === LambdaEventType.DynamoDB) {
                LambdaEventUtils.injectTriggerTagsForDynamoDB(span, originalEvent);
            } else if (lambdaEventType === LambdaEventType.SNS) {
                LambdaEventUtils.injectTriggerTagsForSNS(span, originalEvent);
            } else if (lambdaEventType === LambdaEventType.SQS) {
                LambdaEventUtils.injectTriggerTagsForSQS(span, originalEvent);
            } else if (lambdaEventType === LambdaEventType.S3) {
                LambdaEventUtils.injectTriggerTagsForS3(span, originalEvent);
            } else if (lambdaEventType === LambdaEventType.CloudWatchSchedule) {
                LambdaEventUtils.injectTriggerTagsForCloudWatchSchedule(span, originalEvent);
            } else if (lambdaEventType === LambdaEventType.CloudWatchLog) {
                LambdaEventUtils.injectTriggerTagsForCloudWatchLogs(span, originalEvent);
            } else if (lambdaEventType === LambdaEventType.CloudFront) {
                LambdaEventUtils.injectTriggerTagsForCloudFront(span, originalEvent);
            } else if (lambdaEventType === LambdaEventType.APIGatewayProxy) {
                LambdaEventUtils.injectTriggerTagsForAPIGatewayProxy(span, originalEvent);
            } else if (lambdaEventType === LambdaEventType.Lambda) {
                LambdaEventUtils.injectTriggerTagsForLambda(span, originalContext);
            } else if (lambdaEventType === LambdaEventType.APIGatewayPassThrough) {
                LambdaEventUtils.injectTriggerTagsForAPIGatewayPassThrough(span, originalEvent);
            }
        } catch (error) {
            ThundraLogger.getInstance().error('Cannot inject trigger tags. ' + error);
        }
    }
}

export default function instantiateTracePlugin(config: TraceConfig) {
    return new Trace(config);
}
