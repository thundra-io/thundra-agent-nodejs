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

import {generateId} from './utils';

class Trace {
    constructor(options) {
        this.hooks = {
            'before-invocation': this.beforeInvocation,
            'after-invocation': this.afterInvocation
        };
        this.options = options;
    }

    report = (data) => {
        this.reporter.addReport(data);
    };

    setPluginContext = (pluginContext) => {
        this.pluginContext = pluginContext;
        this.apiKey = pluginContext.apiKey;
    };

    beforeInvocation = (data) => {
        const {originalContext, originalEvent, reporter, contextId} = data;
        this.reporter = reporter;
        this.endTimestamp = null;
        this.startTimestamp = Date.now();
        this.traceData = {
            id: generateId(),
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
                request: originalEvent,
                response: {},
            }
        };
    };

    afterInvocation = (data) => {
        if (data.error) {
            let error = {errorMessage: '', errorType: 'Unknown Error'};
            if (data.error instanceof Error) {
                error.errorType = data.error.name;
                error.errorMessage = data.error.message;
            }
            else if (typeof data.error === 'string') {
                error.errorMessage = data.error.toString();
            }
            else {
                try {
                    error.errorMessage = JSON.stringify(data.error);
                } catch (e) {
                    error.errorMessage = '';
                }
            }
            this.traceData.errors = [...this.traceData.errors, error.errorType];
            this.traceData.thrownError = error.errorType;
            this.traceData.auditInfo.errors = [...this.traceData.auditInfo.errors, error];
            this.traceData.auditInfo.thrownError = error;
        }

        this.traceData.properties.response = data.response;
        this.endTimestamp = Date.now();
        this.traceData.endTimestamp = this.traceData.auditInfo.closeTimestamp = this.endTimestamp;
        this.traceData.duration = this.endTimestamp - this.startTimestamp;
        const reportData = {
            data: this.traceData,
            type: 'AuditData',
            apiKey: this.apiKey,
            dataFormatVersion: '1.0'
        };
        this.report(reportData);
    };
}


export default function instantiateTracePlugin(options) {
    return new Trace(options);
};
