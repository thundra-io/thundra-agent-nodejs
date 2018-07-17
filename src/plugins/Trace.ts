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
import Queue from '../opentracing/Queue';
import ThundraTracer from '../opentracing/Tracer';
import Utils from './Utils';
import TraceData from './data/trace/TraceData';
import TraceDataProperties from './data/trace/TraceProperties';
import {initGlobalTracer} from 'opentracing';
import HttpError from './error/HttpError';
import { LOG_TAG_NAME } from '../Constants';

export class Trace {
    hooks: { 'before-invocation': (data: any) => void; 'after-invocation': (data: any) => void; };
    options: any;
    dataType: string;
    traceData: TraceData;
    reporter: any;
    pluginContext: any;
    apiKey: any;
    endTimestamp: any;
    startTimestamp: number;
    tracer: ThundraTracer;

    constructor(options: any) {
        this.hooks = {
            'before-invocation': this.beforeInvocation,
            'after-invocation': this.afterInvocation,
        };
        this.options = options;
        this.dataType = 'AuditData';
        this.traceData = new TraceData();
        const traceConfig = options ? options.traceConfig : {};
        this.tracer = new ThundraTracer(traceConfig);
        initGlobalTracer(this.tracer);
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
        this.traceData.properties.coldStart = this.pluginContext.requestCount > 0 ? 'false' : 'true',
        this.traceData.properties.functionMemoryLimitInMB =  originalContext.memoryLimitInMB;
        this.traceData.properties.functionRegion = this.pluginContext.applicationRegion;
        this.traceData.properties.functionARN = originalContext.invokedFunctionArn;
        this.traceData.properties.logGroupName = originalContext.logGroupName;
        this.traceData.properties.logStreamName = originalContext.logStreamName;
        this.traceData.properties.requestId = originalContext.awsRequestId;
        this.traceData.properties.request = this.options && this.options.disableRequest ? null : originalEvent;
        this.traceData.properties.response = null;
    }

    afterInvocation = (data: any) => {
        let response = data.response;
        if (data.error) {
            const error = Utils.parseError(data.error);
            if (!(data.error instanceof HttpError)) {
                response = error;
            }
            response = error;
            this.traceData.errors = [...this.traceData.errors, error.errorType];
            this.traceData.thrownError = error.errorType;
            this.traceData.auditInfo.errors = [...this.traceData.auditInfo.errors, error];
            this.traceData.auditInfo.thrownError = error;
        }
        const recorder: ThundraRecorder = this.tracer.getRecorder();
        const spanTree: SpanTreeNode = recorder.getSpanTree();
        this.traceData.auditInfo.children = this.generateAuditInfoFromTraces(spanTree);

        this.traceData.properties.response = this.options && this.options.disableResponse ? null : response;
        this.endTimestamp = Date.now();
        this.traceData.endTimestamp = this.traceData.auditInfo.closeTimestamp = this.endTimestamp;
        this.traceData.duration = this.endTimestamp - this.startTimestamp;
        const reportData = Utils.generateReport(this.traceData, this.dataType, this.apiKey);
        this.report(reportData);
        this.tracer.destroy();
    }

    private generateAuditInfoFromTraces(spanTree: SpanTreeNode): AuditInfo[] {
        if (!spanTree) {
            return [];
        }
        const auditInfos: AuditInfo[] = [];
        const queue: Queue<SpanTreeNode> = new Queue();

        let auditInfo: AuditInfo = this.spanTreeToAuditInfo(spanTree);
        auditInfos.push(auditInfo);
        auditInfos.push(... this.traverse(spanTree, queue, auditInfo));

        while (queue.store.length !== 0) {
            const parent = queue.pop();
            auditInfo = this.spanTreeToAuditInfo(spanTree);
            auditInfos.push(... this.traverse(parent, queue, auditInfo));
        }

        return auditInfos;
    }

    private traverse(parent: SpanTreeNode, queue: Queue<SpanTreeNode>, auditInfo: AuditInfo): AuditInfo[] {
        const children: SpanTreeNode[] = parent.children;
        const auditInfos: AuditInfo[] = new Array<AuditInfo>();
        for (const node of children) {
            auditInfo.children.push(this.spanTreeToAuditInfo(node));
            queue.push(node);
        }
        return auditInfos;
    }

    private spanTreeToAuditInfo(spanTreeNode: SpanTreeNode): AuditInfo {
        const auditInfo: AuditInfo = new AuditInfo();
        auditInfo.id = Utils.generateId();
        auditInfo.errors = null;
        auditInfo.contextName = spanTreeNode.value.operationName;
        auditInfo.openTimestamp = spanTreeNode.value.startTime;
        if (spanTreeNode.thrownError) {
            auditInfo.closeTimestamp = Date.now();
        } else {
            auditInfo.closeTimestamp = spanTreeNode.value.startTime + spanTreeNode.value.duration;
        }
        auditInfo.thrownError = spanTreeNode.thrownError;
        auditInfo.duration = spanTreeNode.value.duration;
        auditInfo.contextType = spanTreeNode.value.className;
        auditInfo.contextGroup = spanTreeNode.value.domainName;

        Object.keys(spanTreeNode.value.tags).forEach((key) => {
            auditInfo.props[key] = String(spanTreeNode.value.tags[key]);
        });
        auditInfo.props[LOG_TAG_NAME] = spanTreeNode.value.logs;
        return auditInfo;
    }
}

export default function instantiateTracePlugin(options: any) {
    return new Trace(options);
}
