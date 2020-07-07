
import InvocationData from './data/invocation/InvocationData';
import Utils from './utils/Utils';
import TimeoutError from './error/TimeoutError';
import InvocationConfig from './config/InvocationConfig';
import {HttpTags, LAMBDA_FUNCTION_PLATFORM} from '../Constants';
import MonitoringDataType from './data/base/MonitoringDataType';
import PluginContext from './PluginContext';
import InvocationSupport from './support/InvocationSupport';
import InvocationTraceSupport from './support/InvocationTraceSupport';
import {ApplicationManager} from '../application/ApplicationManager';

const get = require('lodash.get');

export default class Invocation {
    pluginOrder: number = 2;
    pluginContext: PluginContext;
    contextKey: string = 'invocationData';
    options: InvocationConfig;
    hooks: { 'before-invocation': (pluginContext: PluginContext) => void;
             'after-invocation': (pluginContext: PluginContext) => void; };

    constructor(options?: any) {
        this.hooks = {
            'before-invocation': this.beforeInvocation,
            'after-invocation': this.afterInvocation,
        };
        this.options = options;
    }

    report(data: any, execContext: any): void {
        const reports = get(execContext, 'reports', []);
        execContext.reports = [...reports, data];
    }

    setPluginContext = (pluginContext: PluginContext) => {
        this.pluginContext = pluginContext;
    }

    beforeInvocation = (execContext: any) => {
        if (execContext.error) {
            execContext.error = undefined;
        }

        const pluginContext = this.pluginContext;

        const invocationData = Utils.initMonitoringData(pluginContext,
                             MonitoringDataType.INVOCATION) as InvocationData;

        invocationData.applicationPlatform = LAMBDA_FUNCTION_PLATFORM;
        invocationData.functionRegion = pluginContext.applicationRegion;
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

        invocationData.transactionId = execContext.traceData.transactionId ?
            execContext.traceData.transactionId : ApplicationManager.getPlatformUtils().getTransactionId();

        invocationData.spanId = execContext.spanId;
        invocationData.traceId = execContext.traceId;

        /*
        const xrayTraceInfo = Utils.getXRayTraceInfo();

        if (xrayTraceInfo.traceID) {
            invocationData.tags['aws.xray.trace.id'] = xrayTraceInfo.traceID;
        }
        if (xrayTraceInfo.segmentID) {
            invocationData.tags['aws.xray.segment.id'] = xrayTraceInfo.segmentID;
        }
        */

        ApplicationManager.getPlatformUtils().setInvocationTags(invocationData, pluginContext, execContext);

        execContext[this.contextKey] = invocationData;
    }

    afterInvocation = (execContext: any) => {
        const { error } = execContext;
        const pluginContext = this.pluginContext;
        const invocationData = execContext[this.contextKey];

        if (error) {
            const parsedErr = Utils.parseError(error);
            invocationData.setError(parsedErr);

            if (error instanceof TimeoutError) {
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
            invocationData.setUserTags({[HttpTags.HTTP_STATUS]: response.statusCode});
        }

        const { apiKey } = pluginContext;
        const reportData = Utils.generateReport(invocationData, apiKey);
        this.report(reportData, execContext);

        this.destroy();
    }

    destroy(): void {
        InvocationSupport.removeTags();
        InvocationSupport.removeAgentTags();
        InvocationTraceSupport.clear();
    }
}
