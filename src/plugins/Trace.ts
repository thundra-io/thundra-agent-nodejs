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
import { initGlobalTracer } from 'opentracing';
import * as opentracing from 'opentracing';
import HttpError from './error/HttpError';
import Reporter from '../Reporter';
import TraceConfig from './config/TraceConfig';
import MonitoringDataType from './data/base/MonitoringDataType';
import ThundraSpan from '../opentracing/Span';
import SpanData from './data/trace/SpanData';
import PluginContext from './PluginContext';
import {
    DomainNames, ClassNames,
    TriggerHeaderTags, INTEGRATIONS,
} from '../Constants';
import ThundraSpanContext from '../opentracing/SpanContext';
import LambdaEventUtils, { LambdaEventType } from '../lambda/LambdaEventUtils';
import ThundraLogger from '../ThundraLogger';
import InvocationSupport from './support/InvocationSupport';
import Integration from './integrations/Integration';
import Instrumenter from '../opentracing/instrument/Instrumenter';
import ConfigProvider from '../config/ConfigProvider';
import ConfigNames from '../config/ConfigNames';

const get = require('lodash.get');

export default class Trace {
    hooks: { 'before-invocation': (pluginContext: PluginContext) => void;
            'after-invocation': (pluginContext: PluginContext) => void; };
    config: TraceConfig;
    pluginOrder: number = 1;
    contextKey: string = 'traceData';
    pluginContext: PluginContext;
    integrationsMap: Map<string, Integration>;
    instrumenter: Instrumenter;

    constructor(config: TraceConfig) {
        this.hooks = {
            'before-invocation': this.beforeInvocation,
            'after-invocation': this.afterInvocation,
        };

        this.config = config;
        this.initIntegrations();
        /*
        initGlobalTracer(this.tracer);
        Utils.registerSpanListenersFromConfigurations(this.tracer);
        */
    }

    initIntegrations(): void {
        if (!(this.config.disableInstrumentation || ConfigProvider.get<boolean>(ConfigNames.THUNDRA_TRACE_DISABLE))) {
            this.integrationsMap = new Map<string, Integration>();

            for (const key of Object.keys(INTEGRATIONS)) {
                const clazz = INTEGRATIONS[key];
                if (clazz) {
                    if (!this.integrationsMap.get(key)) {
                        if (!this.config.isConfigDisabled(key)) {
                            const instance = new clazz(this.config);
                            this.integrationsMap.set(key, instance);
                        }
                    }
                }
            }

            this.instrumenter = new Instrumenter(this.config);
            this.instrumenter.hookModuleCompile();
        }
    }

    setPluginContext = (pluginContext: PluginContext) => {
        this.pluginContext = pluginContext;
    }

    report(data: any, execContext: any): void {
        const reports = get(execContext, 'reports', []);
        execContext.reports = [...reports, data];
    }

    beforeInvocation = (execContext: any) => {
        this.destroy();

        const traceData: any = {};
        const { originalContext, originalEvent, tracer } = execContext;

        // awsRequestId can be `id` or undefined in local lambda environments, so we generate a unique id here.
        if (!originalContext.awsRequestId || originalContext.awsRequestId === 'id') {
            originalContext.awsRequestId = Utils.generateId();
        }

        const propagatedSpanContext: ThundraSpanContext =
            this.extractSpanContext(tracer, originalEvent, originalContext) as ThundraSpanContext;

        if (propagatedSpanContext) {
            traceData.traceId = propagatedSpanContext.traceId;
            traceData.transactionId = Utils.generateId();
            tracer.transactionId = traceData.transactionId;

            traceData.rootSpan = tracer._startSpan(originalContext.functionName, {
                propagated: true,
                parentContext: propagatedSpanContext,
                rootTraceId: traceData.traceId,
                domainName: DomainNames.API,
                className: ClassNames.LAMBDA,
            });
        } else {
            traceData.traceId = Utils.generateId();
            traceData.transactionId = Utils.generateId();
            tracer.transactionId = execContext.transactionId;

            traceData.rootSpan = tracer._startSpan(originalContext.functionName, {
                rootTraceId: traceData.traceId,
                domainName: DomainNames.API,
                className: ClassNames.LAMBDA,
            });
        }

        traceData.spanId = traceData.rootSpan.spanContext.spanId;
        traceData.rootSpan.startTime = execContext.startTimestamp;
        traceData.triggerClassName = this.injectTriggerTags(
            traceData.rootSpan, this.pluginContext, originalEvent, originalContext);

        traceData.rootSpan.tags['aws.lambda.memory_limit'] = parseInt(originalContext.memoryLimitInMB, 10);
        traceData.rootSpan.tags['aws.lambda.arn'] = originalContext.invokedFunctionArn;
        traceData.rootSpan.tags['aws.lambda.invocation.coldstart'] = this.pluginContext.requestCount === 0;
        traceData.rootSpan.tags['aws.region'] = this.pluginContext.applicationRegion;
        traceData.rootSpan.tags['aws.lambda.log_group_name'] = originalContext.logGroupName;
        traceData.rootSpan.tags['aws.lambda.name'] = originalContext.functionName;
        traceData.rootSpan.tags['aws.lambda.log_stream_name'] = originalContext.logStreamName;
        traceData.rootSpan.tags['aws.lambda.invocation.request_id'] = originalContext.awsRequestId;
        traceData.rootSpan.tags['aws.lambda.invocation.coldstart'] = this.pluginContext.requestCount === 0;
        traceData.rootSpan.tags['aws.lambda.invocation.request'] = this.getRequest(originalEvent, traceData.triggerClassName);

        execContext[this.contextKey] = traceData;
    }

    afterInvocation = (execContext: any) => {
        let { response } = execContext;
        const { apiKey } = this.pluginContext;
        const { originalEvent, finishTimestamp, tracer } = execContext;
        const { rootSpan, error, triggerClassName } = execContext[this.contextKey];

        if (error) {
            rootSpan.tags.error = true;
            rootSpan.tags['error.message'] = error.errorMessage;
            rootSpan.tags['error.kind'] = error.errorType;
            if (error.code) {
                rootSpan.tags['error.code'] = error.code;
            }
            if (error.stack) {
                rootSpan.tags['error.stack'] = error.stack;
            }
        }

        if (error) {
            const parsedErr = Utils.parseError(error);
            if (!(error instanceof HttpError)) {
                response = error;
            }

            rootSpan.tags.error = true;
            rootSpan.tags['error.message'] = parsedErr.errorMessage;
            rootSpan.tags['error.kind'] = parsedErr.errorType;

            if (parsedErr.code) {
                rootSpan.tags['error.code'] = parsedErr.code;
            }
            if (parsedErr.stack) {
                rootSpan.tags['error.stack'] = parsedErr.stack;
            }
        }

        if (triggerClassName === ClassNames.APIGATEWAY) {
            this.processAPIGWResponse(response, originalEvent);
        }

        rootSpan.tags['aws.lambda.invocation.response'] = this.getResponse(response);

        rootSpan.finish();
        rootSpan.finishTime = finishTimestamp;

        const spanList = tracer.getRecorder().getSpanList();

        const isSampled = get(this.config, 'sampler.isSampled', () => true);
        const sampled = isSampled(rootSpan);

        if (sampled) {
            for (const span of spanList) {
                if (span) {
                    if (this.config.runSamplerOnEachSpan && !isSampled(span)) {
                        ThundraLogger.debug(
                            `Filtering span with name ${span.getOperationName()} due to custom sampling configuration`);
                        continue;
                    }

                    const spanData = this.buildSpanData(span, execContext);
                    const spanReportData = Utils.generateReport(spanData, apiKey);
                    this.report(spanReportData, execContext);
                }
            }
        }

        this.destroy();
    }

    processAPIGWResponse(response: any, originalEvent: any): void {
        try {
            const headers = get(response, 'headers', {});
            headers[TriggerHeaderTags.RESOURCE_NAME] = originalEvent.resource;
            response.headers = headers;
        } catch (error) {
            // Can not set headers property on response, probably it is not an object
        }
    }

    buildSpanData(span: ThundraSpan, execContext: any): SpanData {
        const spanData = Utils.initMonitoringData(this.pluginContext, MonitoringDataType.SPAN) as SpanData;
        const traceData = execContext[this.contextKey];

        spanData.id = span.spanContext.spanId;
        spanData.traceId = traceData.traceId;
        spanData.transactionId = traceData.transactionId;
        spanData.parentSpanId = span.spanContext.parentId;
        spanData.spanOrder = span.order;
        spanData.domainName = span.domainName ? span.domainName : '';
        spanData.className = span.className ? span.className : '';
        spanData.serviceName = traceData.rootSpan.operationName;
        spanData.operationName = span.operationName;
        spanData.startTimestamp = span.startTime;
        spanData.duration = span.getDuration();
        spanData.finishTimestamp = span.finishTime;
        spanData.tags = span.tags;
        spanData.logs = span.logs;

        return spanData;
    }

    destroy(): void {
        /*
        if (this.config && !(this.config.disableInstrumentation)) {
            this.tracer.destroy();
            if (typeof this.instrumenter.unhookModuleCompile === 'function') {
                this.instrumenter.unhookModuleCompile();
            }
        }
        this.triggerClassName = undefined;
        */
    }

    private getRequest(originalEvent: any, triggerClassName: string): any {
        const conf = this.config;

        // Masking and disableRequest should run first
        if (conf && conf.disableRequest) {
            return null;
        }

        if (conf && conf.maskRequest && typeof conf.maskRequest === 'function') {
            try {
                const eventCopy = JSON.parse(JSON.stringify(originalEvent));
                return conf.maskRequest.call(this, eventCopy);
            } catch (error) {
                ThundraLogger.error('Failed to mask request: ' + error);
            }
        }

        let enableRequestData = true;
        if (triggerClassName === ClassNames.CLOUDWATCH && !conf.enableCloudWatchRequest) {
            enableRequestData = false;
        }

        if (triggerClassName === ClassNames.FIREHOSE && !conf.enableFirehoseRequest) {
            enableRequestData = false;
        }

        if (triggerClassName === ClassNames.KINESIS && !conf.enableKinesisRequest) {
            enableRequestData = false;
        }

        if (enableRequestData) {
            return originalEvent;
        } else {
            return null;
        }
    }

    private getResponse(response: any): any {
        const conf = this.config;

        if (conf && conf.disableResponse) {
            return null;
        }

        if (conf && conf.maskResponse && typeof conf.maskResponse === 'function') {
            try {
                const responseCopy = JSON.parse(JSON.stringify(response));
                return conf.maskResponse.call(this, responseCopy);
            } catch (error) {
                ThundraLogger.error('Failed to mask response: ' + error);
            }
        }

        return response;
    }

    private extractSpanContext(tracer: ThundraTracer, originalEvent: any, originalContext: any): opentracing.SpanContext {
        const lambdaEventType = LambdaEventUtils.getLambdaEventType(originalEvent, originalContext);
        if (lambdaEventType === LambdaEventType.Lambda) {
            return tracer.extract(opentracing.FORMAT_TEXT_MAP, originalContext.clientContext.custom);
        } else if (lambdaEventType === LambdaEventType.APIGatewayProxy && originalEvent.headers) {
            return tracer.extract(opentracing.FORMAT_HTTP_HEADERS, originalEvent.headers);
        } else if (lambdaEventType === LambdaEventType.SNS) {
            return LambdaEventUtils.extractSpanContextFromSNSEvent(tracer, originalEvent);
        } else if (lambdaEventType === LambdaEventType.SQS) {
            return LambdaEventUtils.extractSpanContextFromSQSEvent(tracer, originalEvent);
        }
    }

    private injectTriggerTags(span: ThundraSpan, pluginContext: any, originalEvent: any, originalContext: any): String {
        try {
            const lambdaEventType = LambdaEventUtils.getLambdaEventType(originalEvent, originalContext);

            if (lambdaEventType === LambdaEventType.Kinesis) {
                return LambdaEventUtils.injectTriggerTagsForKinesis(span, originalEvent);
            } else if (lambdaEventType === LambdaEventType.FireHose) {
                return LambdaEventUtils.injectTriggerTagsForFirehose(span, originalEvent);
            } else if (lambdaEventType === LambdaEventType.DynamoDB) {
                return LambdaEventUtils.injectTriggerTagsForDynamoDB(span, originalEvent);
            } else if (lambdaEventType === LambdaEventType.SNS) {
                return LambdaEventUtils.injectTriggerTagsForSNS(span, originalEvent);
            } else if (lambdaEventType === LambdaEventType.SQS) {
                return LambdaEventUtils.injectTriggerTagsForSQS(span, originalEvent);
            } else if (lambdaEventType === LambdaEventType.S3) {
                return LambdaEventUtils.injectTriggerTagsForS3(span, originalEvent);
            } else if (lambdaEventType === LambdaEventType.CloudWatchSchedule) {
                return LambdaEventUtils.injectTriggerTagsForCloudWatchSchedule(span, originalEvent);
            } else if (lambdaEventType === LambdaEventType.CloudWatchLog) {
                return LambdaEventUtils.injectTriggerTagsForCloudWatchLogs(span, originalEvent);
            } else if (lambdaEventType === LambdaEventType.CloudFront) {
                return LambdaEventUtils.injectTriggerTagsForCloudFront(span, originalEvent);
            } else if (lambdaEventType === LambdaEventType.APIGatewayProxy) {
                return LambdaEventUtils.injectTriggerTagsForAPIGatewayProxy(span, originalEvent);
            } else if (lambdaEventType === LambdaEventType.Lambda) {
                return LambdaEventUtils.injectTriggerTagsForLambda(span, originalContext);
            } else if (lambdaEventType === LambdaEventType.APIGatewayPassThrough) {
                return LambdaEventUtils.injectTriggerTagsForAPIGatewayPassThrough(span, originalEvent);
            } else if (lambdaEventType === LambdaEventType.EventBridge) {
                return LambdaEventUtils.injectTriggerTagsForEventBridge(span, originalEvent);
            } else if (lambdaEventType === LambdaEventType.Zeit) {
                return LambdaEventUtils.injectTriggerTagsForZeit(span, originalEvent);
            } else if (lambdaEventType === LambdaEventType.Netlify) {
                return LambdaEventUtils.injectTriggerTagsForNetlify(span, pluginContext, originalContext);
            }
        } catch (error) {
            ThundraLogger.error('Cannot inject trigger tags. ' + error);
        }
    }
}
