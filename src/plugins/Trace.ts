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
import AuditInfo from './data/trace/AuditInfo';
import ThundraRecorder from '../opentracing/Recorder';
import SpanTreeNode from '../opentracing/SpanTree';
import ThundraTracer from '../opentracing/Tracer';
import Utils from './Utils';
import TraceData from './data/trace/TraceData';
import TraceDataProperties from './data/trace/TraceProperties';
import {initGlobalTracer} from 'opentracing';
import HttpError from './error/HttpError';
import { LOG_TAG_NAME } from '../Constants';
import TimeoutError from './error/TimeoutError';
import Reporter from '../Reporter';
import TraceConfig from './config/TraceConfig';
import Instrumenter from '../opentracing/instrument/Instrumenter';
import AuditInfoThrownError from './data/trace/AuditInfoThrownError';

export class Trace {
    hooks: { 'before-invocation': (data: any) => void; 'after-invocation': (data: any) => void; };
    config: TraceConfig;
    dataType: string;
    traceData: TraceData;
    reporter: Reporter;
    pluginContext: any;
    apiKey: string;
    endTimestamp: number;
    startTimestamp: number;
    tracer: ThundraTracer;
    instrumenter: Instrumenter;

    constructor(config: TraceConfig) {
        this.hooks = {
            'before-invocation': this.beforeInvocation,
            'after-invocation': this.afterInvocation,
        };
        this.config = config;
        this.dataType = 'AuditData';
        this.traceData = new TraceData();
        const tracerConfig = config ? config.tracerConfig : {};

        this.tracer = new ThundraTracer(tracerConfig);
        initGlobalTracer(this.tracer);

        this.instrumenter = new Instrumenter(this.tracer, config);
        this.instrumenter.hookModuleCompile();
    }

    report(data: any): void {
        this.reporter.addReport(data);
    }

    setPluginContext = (pluginContext: any) => {
        this.pluginContext = pluginContext;
        this.apiKey = pluginContext.apiKey;
    }

    beforeInvocation = (data: any) => {
        const { originalContext, originalEvent, reporter, contextId, transactionId } = data;
        this.reporter = reporter;
        this.endTimestamp = null;
        this.startTimestamp = Date.now();

        this.traceData.id = Utils.generateId();
        this.traceData.transactionId = transactionId;
        this.traceData.applicationName = originalContext.functionName;
        this.traceData.applicationId = this.pluginContext.applicationId;
        this.traceData.applicationVersion = this.pluginContext.applicationVersion;
        this.traceData.applicationProfile = this.pluginContext.applicationProfile;
        this.traceData.duration = null;
        this.traceData.startTimestamp = this.startTimestamp;
        this.traceData.endTimestamp = null;
        this.traceData.errors = [];
        this.traceData.thrownError = null;
        this.traceData.contextName = originalContext.functionName;
        this.traceData.contextId = contextId;

        this.traceData.auditInfo = new AuditInfo();
        this.traceData.auditInfo.contextName = originalContext.functionName;
        this.traceData.auditInfo.id = contextId;
        this.traceData.auditInfo.openTimestamp = this.startTimestamp;
        this.traceData.auditInfo.closeTimestamp = 0;
        this.traceData.auditInfo.thrownError = null;
        this.traceData.auditInfo.children = [];
        this.traceData.auditInfo.duration = 0;
        this.traceData.auditInfo.errors = [];

        this.traceData.properties = new TraceDataProperties();
        this.traceData.properties.timeout = 'false';
        this.traceData.properties.coldStart = this.pluginContext.requestCount > 0 ? 'false' : 'true',
        this.traceData.properties.functionMemoryLimitInMB =  originalContext.memoryLimitInMB;
        this.traceData.properties.functionRegion = this.pluginContext.applicationRegion;
        this.traceData.properties.functionARN = originalContext.invokedFunctionArn;
        this.traceData.properties.logGroupName = originalContext.logGroupName;
        this.traceData.properties.logStreamName = originalContext.logStreamName;
        this.traceData.properties.requestId = originalContext.awsRequestId;
        this.traceData.properties.request = this.getRequest(originalEvent);
        this.traceData.properties.response = null;
    }

    afterInvocation = (data: any) => {
        let response = data.response;
        if (data.error) {
            const error = Utils.parseError(data.error);
            if (!(data.error instanceof HttpError)) {
                response = error;
            }

            if (data.error instanceof TimeoutError) {
                this.traceData.properties.timeout = 'true';
            }

            this.traceData.errors = [...this.traceData.errors, error.errorType];
            this.traceData.thrownError = error.errorType;
            this.traceData.auditInfo.errors = [...this.traceData.auditInfo.errors, error];
            this.traceData.auditInfo.thrownError = error;
        }
        const recorder: ThundraRecorder = this.tracer.getRecorder();
        const spanTree: SpanTreeNode = recorder.getSpanTree();
        this.traceData.auditInfo.children = this.generateAuditInfoFromTraces(spanTree);

        this.traceData.properties.response = this.getResponse(response);
        this.traceData.auditInfo.props.request = this.traceData.properties.request;
        this.traceData.auditInfo.props.response = this.traceData.properties.response;
        this.endTimestamp = Date.now();
        this.traceData.endTimestamp = this.traceData.auditInfo.closeTimestamp = this.endTimestamp;
        this.traceData.auditInfo.duration = this.endTimestamp - this.startTimestamp;
        this.traceData.auditInfo.aliveTime = this.endTimestamp - this.startTimestamp;
        this.traceData.duration = this.endTimestamp - this.startTimestamp;
        const reportData = Utils.generateReport(this.traceData, this.dataType, this.apiKey);
        this.report(reportData);

        this.tracer.destroy();
        this.instrumenter.unhookModuleCompile();
    }

    private generateAuditInfoFromTraces(spanTree: SpanTreeNode): AuditInfo[] {
        if (!spanTree) {
            return [];
        }
        const auditInfos: AuditInfo[] = [];
        const parentAuditInfo: AuditInfo = this.spanTreeToAuditInfo(spanTree);
        auditInfos.push(parentAuditInfo);
        return auditInfos;
    }

    private spanTreeToAuditInfo(spanTreeNode: SpanTreeNode): AuditInfo {
        const auditInfo: AuditInfo = new AuditInfo();
        auditInfo.id = Utils.generateId();
        auditInfo.errors = null;
        auditInfo.contextName = spanTreeNode.value.operationName;
        auditInfo.openTimestamp = spanTreeNode.value.startTime;
        if (spanTreeNode.value.getTag('error')) {
            const thrownError = new AuditInfoThrownError();
            thrownError.errorType = spanTreeNode.value.getTag('error.kind');
            thrownError.errorMessage = spanTreeNode.value.getTag('error.message');
            auditInfo.thrownError = thrownError;
            auditInfo.closeTimestamp = Date.now();
        } else {
            if (spanTreeNode.value.duration === undefined || spanTreeNode.value.duration === null) {
                auditInfo.closeTimestamp = Date.now();
                auditInfo.aliveTime = auditInfo.closeTimestamp - auditInfo.openTimestamp;
                auditInfo.duration = auditInfo.closeTimestamp - auditInfo.openTimestamp;
            } else {
                auditInfo.aliveTime = spanTreeNode.value.duration;
                auditInfo.duration = spanTreeNode.value.duration;
                auditInfo.closeTimestamp = spanTreeNode.value.startTime + spanTreeNode.value.duration;
            }
        }
        auditInfo.contextType = spanTreeNode.value.className;
        auditInfo.contextGroup = spanTreeNode.value.domainName;

        Object.keys(spanTreeNode.value.tags).forEach((key) => {
            auditInfo.props[key] = spanTreeNode.value.tags[key];
        });
        auditInfo.props[LOG_TAG_NAME] = spanTreeNode.value.logs;
        for (const node of spanTreeNode.children) {
            auditInfo.children.push(this.spanTreeToAuditInfo(node));
        }
        return auditInfo;
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
