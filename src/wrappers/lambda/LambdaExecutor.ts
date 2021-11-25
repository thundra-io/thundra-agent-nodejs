/**
 * Hooks into AWS Lambda invocation and executes it
 */

import Utils from '../../utils/Utils';
import ThundraSpanContext from '../../opentracing/SpanContext';
import {
    DomainNames, ClassNames, LAMBDA_FUNCTION_PLATFORM, THUNDRA_TRACE_KEY,
    AwsTags, AwsLambdaWrapperTags, TriggerHeaderTags, HttpTags } from '../../Constants';
import ThundraTracer from '../../opentracing/Tracer';
import LambdaEventUtils, { LambdaEventType } from './LambdaEventUtils';
import * as opentracing from 'opentracing';
import ThundraSpan from '../../opentracing/Span';
import ThundraLogger from '../../ThundraLogger';
import PluginContext from '../../plugins/PluginContext';
import HttpError from '../../error/HttpError';
import MonitoringDataType from '../../plugins/data/base/MonitoringDataType';
import InvocationData from '../../plugins/data/invocation/InvocationData';
import TimeoutError from '../../error/TimeoutError';
import InvocationSupport from '../../plugins/support/InvocationSupport';
import InvocationTraceSupport from '../../plugins/support/InvocationTraceSupport';
import TraceConfig from '../../plugins/config/TraceConfig';
import { LambdaContextProvider } from './LambdaContextProvider';
import { LambdaPlatformUtils } from './LambdaPlatformUtils';
import ExecutionContext from '../../context/ExecutionContext';
import ConfigProvider from '../../config/ConfigProvider';
import ConfigNames from '../../config/ConfigNames';

const get = require('lodash.get');

/**
 * Starts trace for AWS Lambda request
 * @param {PluginContext} pluginContext the {@link PluginContext}
 * @param {ExecutionContext} execContext the {@link ExecutionContext}
 * @param {TraceConfig} config the {@link TraceConfig}
 */
export function startTrace(pluginContext: PluginContext, execContext: ExecutionContext, config: TraceConfig) {
    ThundraLogger.debug('<LambdaExecutor> Start trace of transaction', execContext.transactionId);

    const { platformData, tracer } = execContext;
    const { originalEvent, originalContext } = platformData;

    // awsRequestId can be `id` or undefined in local lambda environments, so we generate a unique id here.
    if (!originalContext.awsRequestId || originalContext.awsRequestId === 'id') {
        originalContext.awsRequestId = Utils.generateId();
    }

    const lambdaEventType = LambdaEventUtils.getLambdaEventType(originalEvent, originalContext);
    ThundraLogger.debug(
        '<LambdaExecutor> Detected invocation event type of transaction',
        execContext.transactionId, ':', LambdaEventType[lambdaEventType]);

    const propagatedSpanContext: ThundraSpanContext =
        extractSpanContext(tracer, lambdaEventType, originalEvent, originalContext) as ThundraSpanContext;

    ThundraLogger.debug(
        '<LambdaExecutor> Extracted span context of transaction',
        execContext.transactionId, ':', propagatedSpanContext);

    execContext.traceId = get(propagatedSpanContext, 'traceId') || Utils.generateId();

    execContext.rootSpan = tracer._startSpan(originalContext.functionName, {
        propagated: propagatedSpanContext ? true : false,
        parentContext: propagatedSpanContext,
        rootTraceId: execContext.traceId,
        domainName: DomainNames.API,
        className: ClassNames.LAMBDA,
    });

    execContext.rootSpan.isRootSpan = true;
    execContext.spanId = execContext.rootSpan.spanContext.spanId;
    execContext.rootSpan.startTime = execContext.startTimestamp;
    execContext.triggerClassName =
        injectTriggerTags(execContext.rootSpan, pluginContext, execContext,
                          lambdaEventType, originalEvent, originalContext);

    ThundraLogger.debug(
        '<LambdaExecutor> Injected trigger tags of transaction', execContext.transactionId,
        'for trigger type:', execContext.triggerClassName);

    execContext.rootSpan.tags[AwsTags.AWS_REGION] = pluginContext.applicationInfo.applicationRegion;
    execContext.rootSpan.tags[AwsLambdaWrapperTags.AWS_LAMBDA_ARN] = originalContext.invokedFunctionArn;
    execContext.rootSpan.tags[AwsLambdaWrapperTags.AWS_LAMBDA_NAME] = originalContext.functionName;
    execContext.rootSpan.tags[AwsLambdaWrapperTags.AWS_LAMBDA_MEMORY_LIMIT] = parseInt(originalContext.memoryLimitInMB, 10);
    execContext.rootSpan.tags[AwsLambdaWrapperTags.AWS_LAMBDA_LOG_GROUP_NAME] = originalContext.logGroupName;
    execContext.rootSpan.tags[AwsLambdaWrapperTags.AWS_LAMBDA_LOG_STREAM_NAME] = originalContext.logStreamName;
    execContext.rootSpan.tags[AwsLambdaWrapperTags.AWS_LAMBDA_INVOCATION_COLDSTART] = pluginContext.requestCount === 0;
    execContext.rootSpan.tags[AwsLambdaWrapperTags.AWS_LAMBDA_INVOCATION_REQUEST_ID] = originalContext.awsRequestId;

    const request = getRequest(originalEvent, execContext.triggerClassName, config);
    ThundraLogger.debug(
        '<LambdaExecutor> Captured invocation request of transaction',
        execContext.transactionId, ':', request);
    execContext.rootSpan.tags[AwsLambdaWrapperTags.AWS_LAMBDA_INVOCATION_REQUEST] = request;
}

/**
 * Finishes trace for AWS Lambda request
 * @param {PluginContext} pluginContext the {@link PluginContext}
 * @param {ExecutionContext} execContext the {@link ExecutionContext}
 * @param {TraceConfig} config the {@link TraceConfig}
 */
export function finishTrace(pluginContext: PluginContext, execContext: ExecutionContext, config: TraceConfig) {
    ThundraLogger.debug('<LambdaExecutor> Finish trace of transaction', execContext.transactionId);

    let { response, error } = execContext;
    const { rootSpan, userError, triggerClassName, platformData, finishTimestamp } = execContext;
    const { originalEvent } = platformData;

    error = error || userError;

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

    const resp = getResponse(response, config);
    ThundraLogger.debug(
        '<LambdaExecutor> Captured invocation response of transaction',
        execContext.transactionId, ':', resp);
    rootSpan.tags[AwsLambdaWrapperTags.AWS_LAMBDA_INVOCATION_RESPONSE] = resp;

    rootSpan.finish();
    rootSpan.finishTime = finishTimestamp;
}

/**
 * Starts invocation for AWS Lambda request
 * @param {PluginContext} pluginContext the {@link PluginContext}
 * @param {ExecutionContext} execContext the {@link ExecutionContext}
 */
export function startInvocation(pluginContext: PluginContext, execContext: ExecutionContext) {
    ThundraLogger.debug('<LambdaExecutor> Start invocation of transaction', execContext.transactionId);

    const invocationData = Utils.initMonitoringData(pluginContext, MonitoringDataType.INVOCATION) as InvocationData;

    invocationData.applicationPlatform = LAMBDA_FUNCTION_PLATFORM; // TODO: get from platform
    invocationData.applicationRegion = pluginContext.applicationInfo.applicationRegion;
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

    invocationData.traceId = execContext.traceId;
    invocationData.transactionId = execContext.transactionId;
    invocationData.spanId = execContext.spanId;

    setInvocationTags(invocationData, pluginContext, execContext);

    execContext.invocationData = invocationData;
}

function setInvocationTags(invocationData: any, pluginContext: PluginContext, execContext: ExecutionContext) {
    ThundraLogger.debug('<LambdaExecutor> Setting invocation tags of transaction', execContext.transactionId);

    const originalContext = LambdaContextProvider.getContext();

    invocationData.tags[AwsTags.AWS_REGION] = pluginContext.applicationInfo.applicationRegion;
    invocationData.tags[AwsLambdaWrapperTags.AWS_LAMBDA_MEMORY_LIMIT] = pluginContext.maxMemory;
    invocationData.tags[AwsLambdaWrapperTags.AWS_LAMBDA_INVOCATION_COLDSTART] = pluginContext.requestCount === 0;
    invocationData.tags[AwsLambdaWrapperTags.AWS_LAMBDA_INVOCATION_TIMEOUT] = false;

    if (originalContext) {
        invocationData.tags[AwsTags.AWS_ACCOUNT_NO] =
            LambdaPlatformUtils.getAWSAccountNo(originalContext.invokedFunctionArn);
        invocationData.tags[AwsLambdaWrapperTags.AWS_LAMBDA_ARN] = originalContext.invokedFunctionArn;
        invocationData.tags[AwsLambdaWrapperTags.AWS_LAMBDA_NAME] = originalContext ? originalContext.functionName : '';
        invocationData.tags[AwsLambdaWrapperTags.AWS_LAMBDA_LOG_GROUP_NAME] = originalContext ? originalContext.logGroupName : '';
        invocationData.tags[AwsLambdaWrapperTags.AWS_LAMBDA_LOG_STREAM_NAME] = originalContext.logStreamName;
        invocationData.tags[AwsLambdaWrapperTags.AWS_LAMBDA_INVOCATION_REQUEST_ID] = originalContext.awsRequestId;
    }

    const { heapUsed } = process.memoryUsage();
    invocationData.tags[AwsLambdaWrapperTags.AWS_LAMBDA_INVOCATION_MEMORY_USAGE] = Math.floor(heapUsed / (1024 * 1024));

    const xrayTraceInfo = Utils.getXRayTraceInfo();

    if (xrayTraceInfo.traceID) {
        invocationData.tags[AwsTags.AWS_XRAY_TRACE_ID] = xrayTraceInfo.traceID;
    }
    if (xrayTraceInfo.segmentID) {
        invocationData.tags[AwsTags.AWS_XRAY_SEGMENT_ID] = xrayTraceInfo.segmentID;
    }
}

/**
 * Finishes invocation for AWS Lambda request
 * @param {PluginContext} pluginContext the {@link PluginContext}
 * @param {ExecutionContext} execContext the {@link ExecutionContext}
 */
export function finishInvocation(pluginContext: PluginContext, execContext: ExecutionContext) {
    ThundraLogger.debug('<LambdaExecutor> Finish invocation of transaction', execContext.transactionId);

    let { error } = execContext;
    const { invocationData, userError } = execContext;

    error = error || userError;

    if (error) {
        const parsedErr = Utils.parseError(error);
        invocationData.setError(parsedErr);

        if (error instanceof TimeoutError) {
            invocationData.timeout = true;
            invocationData.tags[AwsLambdaWrapperTags.AWS_LAMBDA_INVOCATION_TIMEOUT] = true;
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

    invocationData.setTags(InvocationSupport.getAgentTags());
    invocationData.setUserTags(InvocationSupport.getTags());

    const { startTimestamp, finishTimestamp, spanId, response, platformData } = execContext;
    const { originalEvent } = platformData;

    // Inject step functions trace links
    injectStepFunctionInfo(originalEvent, response, execContext);
    // Inject appsync trace id
    injectAppsyncInfo(originalEvent, response, execContext);

    invocationData.finishTimestamp = finishTimestamp;
    invocationData.duration = finishTimestamp - startTimestamp;
    invocationData.resources = InvocationTraceSupport.getResources(spanId);
    invocationData.incomingTraceLinks = InvocationTraceSupport.getIncomingTraceLinks();
    invocationData.outgoingTraceLinks = InvocationTraceSupport.getOutgoingTraceLinks();

    if (Utils.isValidHTTPResponse(response)) {
        invocationData.setUserTags({ [HttpTags.HTTP_STATUS]: response.statusCode });
    }
}

function extractSpanContext(tracer: ThundraTracer, lambdaEventType: LambdaEventType,
                            originalEvent: any, originalContext: any): opentracing.SpanContext {
    if (lambdaEventType === LambdaEventType.Lambda) {
        return tracer.extract(opentracing.FORMAT_TEXT_MAP, originalContext.clientContext.custom);
    } else if (lambdaEventType === LambdaEventType.APIGatewayProxy && originalEvent.headers) {
        return tracer.extract(opentracing.FORMAT_HTTP_HEADERS, originalEvent.headers);
    } else if (lambdaEventType === LambdaEventType.SNS) {
        return LambdaEventUtils.extractSpanContextFromSNSEvent(tracer, originalEvent);
    } else if (lambdaEventType === LambdaEventType.SQS) {
        return LambdaEventUtils.extractSpanContextFromSQSEvent(tracer, originalEvent);
    } else if (lambdaEventType === LambdaEventType.AmazonMQ) {
        return LambdaEventUtils.extractSpanContextFromAmazonRMQEvent(tracer, originalEvent);
    }
}

function processAPIGWResponse(response: any, originalEvent: any): void {
    // If response is custom authorizer response, skip processing it
    if (response && response.principalId && response.policyDocument) {
        return;
    }
    try {
        const headers = get(response, 'headers', {});
        headers[TriggerHeaderTags.RESOURCE_NAME] = LambdaEventUtils.getApigatewayResource(originalEvent);
        response.headers = headers;
    } catch (error) {
        // Can not set headers property on response, probably it is not an object
    }
}

function injectTriggerTags(span: ThundraSpan, pluginContext: PluginContext, execContext: ExecutionContext,
                           lambdaEventType: LambdaEventType, originalEvent: any, originalContext: any): string {
    try {
        LambdaEventUtils.extractTraceLinkFromEvent(originalEvent);
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
        } else if (lambdaEventType === LambdaEventType.Vercel) {
            return LambdaEventUtils.injectTriggerTagsForVercel(span, originalEvent, originalContext);
        } else if (lambdaEventType === LambdaEventType.Netlify) {
            return LambdaEventUtils.injectTriggerTagsForNetlify(span, originalEvent);
        } else if (lambdaEventType === LambdaEventType.AmazonMQ) {
            return LambdaEventUtils.injectTriggerTagsForAmazonRMQ(span, originalEvent, originalContext);
        } else {
            return LambdaEventUtils.injectTriggerTagsForCommon(span, originalEvent, originalContext);
        }
    } catch (error) {
        ThundraLogger.error('<LambdaExecutor> Cannot inject trigger tags:', error);
    }
}

function injectAppsyncInfo(request: any, response: any, execContext: ExecutionContext): any {
    try {
        const isAppsync = ConfigProvider.get<boolean>(ConfigNames.THUNDRA_LAMBDA_AWS_APPSYNC);
        ThundraLogger.debug(
            '<LambdaExecutor> Checked whether AWS Appsync support is enabled for transaction',
            execContext.transactionId, ':', isAppsync);
        if (isAppsync) {
            const traceId = execContext.traceId;
            if (typeof response === 'object' && response !== null) {
                const thundraTraceKey = {
                    trace_id: traceId,
                };
                ThundraLogger.debug(
                    '<LambdaExecutor> Injected Thundra AppSync trace key for transaction',
                    execContext.transactionId, ':', thundraTraceKey);
                response[THUNDRA_TRACE_KEY] = thundraTraceKey;
            } else {
                ThundraLogger.debug(
                    '<LambdaExecutor> Since response is not object, \
                    skipped Thundra AppSync trace key injection for transaction',
                    execContext.transactionId);
            }
        }
    } catch (error) {
        ThundraLogger.error('<LambdaExecutor> Failed to inject appsync trace id:', error);
    }
}

function injectStepFunctionInfo(request: any, response: any, execContext: ExecutionContext): any {
    try {
        const isStepFunction = ConfigProvider.get<boolean>(ConfigNames.THUNDRA_LAMBDA_AWS_STEPFUNCTIONS);
        ThundraLogger.debug(
            '<LambdaExecutor> Checked whether AWS StepFunctions support is enabled for transaction',
            execContext.transactionId, ':', isStepFunction);
        if (isStepFunction) {
            const traceLink = Utils.generateId();
            let step = 0;

            const incomingStep = get(request, `${THUNDRA_TRACE_KEY}.step`);
            if (incomingStep) {
                step = incomingStep;
            }

            if (typeof response === 'object' && response !== null) {
                const thundraTraceKey = {
                    trace_link: traceLink,
                    step: step + 1,
                };
                ThundraLogger.debug(
                    '<LambdaExecutor> Injected Thundra trace key for transaction',
                    execContext.transactionId, ':', thundraTraceKey);
                response[THUNDRA_TRACE_KEY] = thundraTraceKey;
            } else {
                ThundraLogger.debug(
                    '<LambdaExecutor> Since response is not object, \
                    skipped Thundra trace key injection for transaction',
                    execContext.transactionId);
            }

            InvocationTraceSupport.addOutgoingTraceLink(traceLink);
        }
    } catch (error) {
        ThundraLogger.error('<LambdaExecutor> Failed to inject step function trace links:', error);
    }
}

function getRequest(originalEvent: any, triggerClassName: string, config: TraceConfig): any {
    // Masking and disableRequest should run first
    if (config && config.disableRequest) {
        return null;
    }

    if (config && config.maskRequest && typeof config.maskRequest === 'function') {
        try {
            const eventCopy = JSON.parse(JSON.stringify(originalEvent));
            return config.maskRequest.call({}, eventCopy);
        } catch (error) {
            ThundraLogger.error('<LambdaExecutor> Failed to mask request:', error);
        }
    }

    let enableRequestData = true;
    if (triggerClassName === ClassNames.CLOUDWATCH && !config.enableCloudWatchRequest) {
        enableRequestData = false;
    }

    if (triggerClassName === ClassNames.FIREHOSE && !config.enableFirehoseRequest) {
        enableRequestData = false;
    }

    if (triggerClassName === ClassNames.KINESIS && !config.enableKinesisRequest) {
        enableRequestData = false;
    }

    if (enableRequestData) {
        return originalEvent;
    } else {
        return null;
    }
}

function getResponse(response: any, config: TraceConfig): any {
    if (config && config.disableResponse) {
        return null;
    }

    if (config && config.maskResponse && typeof config.maskResponse === 'function') {
        try {
            const responseCopy = JSON.parse(JSON.stringify(response));
            return config.maskResponse.call({}, responseCopy);
        } catch (error) {
            ThundraLogger.error('<LambdaExecutor> Failed to mask response:', error);
        }
    }

    return response;
}
