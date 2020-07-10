import Utils from '../plugins/utils/Utils';
import ThundraSpanContext from '../opentracing/SpanContext';
import { DomainNames, ClassNames, TriggerHeaderTags, LAMBDA_FUNCTION_PLATFORM, HttpTags } from '../Constants';
import ThundraTracer from '../opentracing/Tracer';
import LambdaEventUtils, { LambdaEventType } from './LambdaEventUtils';
import * as opentracing from 'opentracing';
import ThundraSpan from '../opentracing/Span';
import ThundraLogger from '../ThundraLogger';
import PluginContext from '../plugins/PluginContext';
import ConfigProvider from '../config/ConfigProvider';
import HttpError from '../plugins/error/HttpError';
import MonitoringDataType from '../plugins/data/base/MonitoringDataType';
import InvocationData from '../plugins/data/invocation/InvocationData';
import { ApplicationManager } from '../application/ApplicationManager';
import TimeoutError from '../plugins/error/TimeoutError';
import InvocationSupport from '../plugins/support/InvocationSupport';
import InvocationTraceSupport from '../plugins/support/InvocationTraceSupport';

const get = require('lodash.get');

export function startTrace(pluginContext: PluginContext, execContext: any) {
    const { originalContext, originalEvent, tracer } = execContext;

    // awsRequestId can be `id` or undefined in local lambda environments, so we generate a unique id here.
    if (!originalContext.awsRequestId || originalContext.awsRequestId === 'id') {
        originalContext.awsRequestId = Utils.generateId();
    }

    const propagatedSpanContext: ThundraSpanContext =
        extractSpanContext(tracer, originalEvent, originalContext) as ThundraSpanContext;

    if (propagatedSpanContext) {
        execContext.traceId = propagatedSpanContext.traceId;
        execContext.transactionId = Utils.generateId();
        tracer.transactionId = execContext.transactionId;

        execContext.rootSpan = tracer._startSpan(originalContext.functionName, {
            propagated: true,
            parentContext: propagatedSpanContext,
            rootTraceId: execContext.traceId,
            domainName: DomainNames.API,
            className: ClassNames.LAMBDA,
        });
    } else {
        execContext.traceId = Utils.generateId();
        execContext.transactionId = Utils.generateId();
        tracer.transactionId = execContext.transactionId;

        execContext.rootSpan = tracer._startSpan(originalContext.functionName, {
            rootTraceId: execContext.traceId,
            domainName: DomainNames.API,
            className: ClassNames.LAMBDA,
        });
    }

    execContext.spanId = execContext.rootSpan.spanContext.spanId;
    execContext.rootSpan.startTime = execContext.startTimestamp;
    execContext.triggerClassName = injectTriggerTags(
        execContext.rootSpan, pluginContext, originalEvent, originalContext);

    execContext.rootSpan.tags['aws.lambda.memory_limit'] = parseInt(originalContext.memoryLimitInMB, 10);
    execContext.rootSpan.tags['aws.lambda.arn'] = originalContext.invokedFunctionArn;
    execContext.rootSpan.tags['aws.lambda.invocation.coldstart'] = pluginContext.requestCount === 0;
    execContext.rootSpan.tags['aws.region'] = pluginContext.applicationRegion;
    execContext.rootSpan.tags['aws.lambda.log_group_name'] = originalContext.logGroupName;
    execContext.rootSpan.tags['aws.lambda.name'] = originalContext.functionName;
    execContext.rootSpan.tags['aws.lambda.log_stream_name'] = originalContext.logStreamName;
    execContext.rootSpan.tags['aws.lambda.invocation.request_id'] = originalContext.awsRequestId;
    execContext.rootSpan.tags['aws.lambda.invocation.coldstart'] = pluginContext.requestCount === 0;
    execContext.rootSpan.tags['aws.lambda.invocation.request'] = getRequest(originalEvent, execContext.triggerClassName);
}

export function finishTrace(pluginContext: PluginContext, execContext: any) {
    let { response } = execContext;
    const { rootSpan, error, triggerClassName, originalEvent, finishTimestamp } = execContext;

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
        processAPIGWResponse(response, originalEvent);
    }

    rootSpan.tags['aws.lambda.invocation.response'] = getResponse(response);

    rootSpan.finish();
    rootSpan.finishTime = finishTimestamp;
}

export function startInvocation(pluginContext: PluginContext, execContext: any) {
    const invocationData = Utils.initMonitoringData(pluginContext,
        MonitoringDataType.INVOCATION) as InvocationData;

    invocationData.applicationPlatform = LAMBDA_FUNCTION_PLATFORM; // TODO: get from platform
    invocationData.applicationRegion = pluginContext.applicationRegion;
    invocationData.tags = {};
    invocationData.userTags = {};
    invocationData.startTimestamp = execContext.startTimestamp;
    invocationData.finishTimestamp = 0;
    invocationData.duration = 0;
    invocationData.erroneous = false;
    invocationData.errorType = '';
    invocationData.errorMessage = '';
    invocationData.coldStart = pluginContext.requestCount === 0;
    invocationData.timeout = false;

    invocationData.transactionId = execContext.transactionId ?
        execContext.transactionId : ApplicationManager.getPlatformUtils().getTransactionId();

    invocationData.spanId = execContext.spanId;
    invocationData.traceId = execContext.traceId;

    ApplicationManager.getPlatformUtils().setInvocationTags(invocationData, pluginContext, execContext);

    execContext.invocationData = invocationData;
}

export function finishInvocation(pluginContext: PluginContext, execContext: any) {
    const { error, invocationData } = execContext;

    if (error) {
        const parsedErr = Utils.parseError(error);
        invocationData.setError(parsedErr);

        if (error instanceof TimeoutError) { // TODO: Move to platform utils
            invocationData.timeout = true;
            invocationData.tags['aws.lambda.invocation.timeout'] = true;
        }

        invocationData.tags.error = true;
        invocationData.tags['error.message'] = parsedErr.errorMessage;
        invocationData.tags['error.kind'] = parsedErr.errorType;
        invocationData.tags['error.stack'] = parsedErr.stack;
        if (parsedErr.code) {
            invocationData.tags['error.code'] = error.code;
        }
        if (parsedErr.stack) {
            invocationData.tags['error.stack'] = error.stack;
        }
    }

    invocationData.setTags(InvocationSupport.tags);
    invocationData.setUserTags(InvocationSupport.userTags);

    const { startTimestamp, finishTimestamp, spanId, response } = execContext;

    invocationData.finishTimestamp = finishTimestamp;
    invocationData.duration = finishTimestamp - startTimestamp;
    invocationData.resources = InvocationTraceSupport.getResources(spanId);
    invocationData.incomingTraceLinks = InvocationTraceSupport.getIncomingTraceLinks();
    invocationData.outgoingTraceLinks = InvocationTraceSupport.getOutgoingTraceLinks();

    if (Utils.isValidHTTPResponse(response)) {
        invocationData.setUserTags({ [HttpTags.HTTP_STATUS]: response.statusCode });
    }
}

function extractSpanContext(tracer: ThundraTracer, originalEvent: any, originalContext: any): opentracing.SpanContext {
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

function processAPIGWResponse(response: any, originalEvent: any): void {
    try {
        const headers = get(response, 'headers', {});
        headers[TriggerHeaderTags.RESOURCE_NAME] = originalEvent.resource;
        response.headers = headers;
    } catch (error) {
        // Can not set headers property on response, probably it is not an object
    }
}

function injectTriggerTags(span: ThundraSpan, pluginContext: any, originalEvent: any, originalContext: any): String {
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

function getRequest(originalEvent: any, triggerClassName: string): any {
    const thundraConfig = ConfigProvider.thundraConfig;
    const conf = thundraConfig.traceConfig;

    // Masking and disableRequest should run first
    if (conf && conf.disableRequest) {
        return null;
    }

    if (conf && conf.maskRequest && typeof conf.maskRequest === 'function') {
        try {
            const eventCopy = JSON.parse(JSON.stringify(originalEvent));
            return conf.maskRequest.call({}, eventCopy);
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

function getResponse(response: any): any {
    const thundraConfig = ConfigProvider.thundraConfig;
    const conf = thundraConfig.traceConfig;

    if (conf && conf.disableResponse) {
        return null;
    }

    if (conf && conf.maskResponse && typeof conf.maskResponse === 'function') {
        try {
            const responseCopy = JSON.parse(JSON.stringify(response));
            return conf.maskResponse.call({}, responseCopy);
        } catch (error) {
            ThundraLogger.error('Failed to mask response: ' + error);
        }
    }

    return response;
}
