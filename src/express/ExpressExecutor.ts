import Utils from '../plugins/utils/Utils';
import { LAMBDA_FUNCTION_PLATFORM, HttpTags, DomainNames, ClassNames } from '../Constants';
import PluginContext from '../plugins/PluginContext';
import MonitoringDataType from '../plugins/data/base/MonitoringDataType';
import InvocationData from '../plugins/data/invocation/InvocationData';
import { ApplicationManager } from '../application/ApplicationManager';
import TimeoutError from '../plugins/error/TimeoutError';
import InvocationSupport from '../plugins/support/InvocationSupport';
import InvocationTraceSupport from '../plugins/support/InvocationTraceSupport';

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

export function startTrace(pluginContext: PluginContext, execContext: any) {
    const { tracer } = execContext;

    execContext.traceId = Utils.generateId();
    execContext.transactionId = Utils.generateId();
    tracer.transactionId = execContext.transactionId;

    execContext.rootSpan = tracer._startSpan('express-root-span', {
        rootTraceId: execContext.traceId,
        domainName: DomainNames.API,
        className: ClassNames.EXPRESS,
    });

    execContext.spanId = execContext.rootSpan.spanContext.spanId;
    execContext.rootSpan.startTime = execContext.startTimestamp;
}

export function finishTrace(pluginContext: PluginContext, execContext: any) {
    const { rootSpan, finishTimestamp } = execContext;

    rootSpan.finish();
    rootSpan.finishTime = finishTimestamp;
}
