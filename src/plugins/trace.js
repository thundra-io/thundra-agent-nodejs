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

import {generateId, generateReport, parseError} from './utils';
import { HttpError } from '../constants';

class Trace {
    constructor(options) {
        this.hooks = {
            'before-invocation': this.beforeInvocation,
            'after-invocation': this.afterInvocation
        };
        this.options = options;
        this.dataType = 'AuditData';
        this.traceData = {};
    }

    report = (data) => {
        this.reporter.addReport(data);
    };

    setPluginContext = (pluginContext) => {
        this.pluginContext = pluginContext;
        this.apiKey = pluginContext.apiKey;
    };

    beforeInvocation = (data) => {
        const {originalContext, originalEvent, reporter, contextId, transactionId} = data;
        this.reporter = reporter;
        this.endTimestamp = null;
        this.startTimestamp = Date.now();
        this.traceData = {
            id: generateId(),
            transactionId: transactionId,
            applicationName: originalContext.functionName,
            applicationId: this.pluginContext.applicationId,
            applicationVersion: this.pluginContext.applicationVersion,
            applicationProfile: this.pluginContext.applicationProfile,
            applicationType: 'node',
            duration: null,
            startTimestamp: this.startTimestamp,
            endTimestamp: null,
            errors: [],
            thrownError: null,
            contextType: 'ExecutionContext',
            contextName: originalContext.functionName,
            contextId: contextId,
            auditInfo: {
                contextName: originalContext.functionName,
                id: contextId,
                openTimestamp: this.startTimestamp,
                closeTimestamp: null,
                errors: [],
                thrownError: null,
            },     
            properties: {
                coldStart: this.pluginContext.requestCount > 0 ? 'false' : 'true',
                functionMemoryLimitInMB: originalContext.memoryLimitInMB,
                functionRegion: this.pluginContext.applicationRegion,
                functionARN: originalContext.invokedFunctionArn,
                logGroupName: originalContext.logGroupName,
                logStreamName: originalContext.logStreamName,
                requestId: originalContext.awsRequestId,
                request: this.options && this.options.disableRequest ? null : originalEvent,
                response: null,
            }
        };
    };

    afterInvocation = (data) => {
        let response = data.response;
        if (data.error) {
            let error = parseError(data.error);
            if (!(data.error instanceof HttpError)) {
                response = error;
            }
            this.traceData.errors = [...this.traceData.errors, error.errorType];
            this.traceData.thrownError = error.errorType;
            this.traceData.auditInfo.errors = [...this.traceData.auditInfo.errors, error];
            this.traceData.auditInfo.thrownError = error;
        }
        this.traceData.properties.response = this.options && this.options.disableResponse ? null : response;
        this.endTimestamp = Date.now();
        this.traceData.endTimestamp = this.traceData.auditInfo.closeTimestamp = this.endTimestamp;
        this.traceData.duration = this.endTimestamp - this.startTimestamp;
        const reportData = generateReport(this.traceData, this.dataType, this.apiKey);
        this.report(reportData);
    };
}


export default function instantiateTracePlugin(options) {
    return new Trace(options);
};
