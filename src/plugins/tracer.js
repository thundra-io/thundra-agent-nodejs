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

import globals from "./../globals";
import {
    formatDate,
    generateId,
    getApplicationId,
    getApplicationProfile,
    getApplicationVersion,
    getApplicationRegion,
} from "./utils";


class Tracer {
    constructor(options) {
        this.hooks = {
            "before-invocation": this.beforeInvocation,
            "after-invocation": this.afterInvocation
        };
        this.options = options;
    }

    beforeInvocation = (data) => {
        const contextId = generateId();
        const {originalContext, originalEvent, reporter, apiKey} = data;
        this.reporter = reporter;
        this.apiKey = apiKey;
        this.endTime = null;
        this.startTime = new Date();
        const formattedStartTime = formatDate(this.startTime);
        this.traceData = {
            id: generateId(),
            applicationName: originalContext.functionName,
            applicationId: getApplicationId(),
            applicationVersion: getApplicationVersion(),
            applicationProfile: getApplicationProfile(),
            applicationType: "node",
            duration: null,
            startTime: formattedStartTime,
            endTime: null,
            errors: [],
            thrownError: null,
            contextType: "ExecutionContext",
            contextName: originalContext.functionName,
            contextId: contextId,
            auditInfo: {
                contextName: originalContext.functionName,
                id: contextId,
                openTime: formattedStartTime,
                closeTime: null,
                errors: [],
                thrownError: null,
            },
            properties: {
                coldStart: globals.requestCount > 0 ? "false" : "true",
                functionMemoryLimitInMB: originalContext.memoryLimitInMB,
                functionRegion: getApplicationRegion(),
                request: originalEvent,
                response: {},
            }
        };

        globals.requestCount += 1;
    };

    afterInvocation = (data) => {
        if (data.error) {
            let error = {errorMessage: "", errorType: "Unknown Error"};
            if (data.error instanceof Error) {
                error.errorType = data.error.name;
                error.errorMessage = data.error.message;
            }
            else if (typeof data.error === "string") {
                error.errorMessage = data.error.toString();
            }
            else {
                try {
                    error.errorMessage = JSON.stringify(data.error);
                } catch (e) {
                    error.errorMessage = "";
                }
            }
            this.traceData.errors = [...this.traceData.errors, error.errorType];
            this.traceData.thrownError = error.errorType;
            this.traceData.auditInfo.errors = [...this.traceData.auditInfo.errors, error];
            this.traceData.auditInfo.thrownError = error;
        }

        this.traceData.properties.response = data.response;
        this.endTime = new Date();
        this.traceData.endTime = this.traceData.auditInfo.closeTime = formatDate(this.endTime);
        this.traceData.duration = this.endTime - this.startTime;
        const reportData = {
            data: this.traceData,
            type: "AuditData",
            apiKey: this.apiKey,
            dataFormatVersion: "1.0"
        };
        this.report(reportData);

    };

    report = (data) => {
        this.reporter.addReport(data);
    }
}


export default function createTracer(options) {
    return new Tracer(options);

};
