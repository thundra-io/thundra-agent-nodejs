import ThundraTracer from '../opentracing/Tracer';
import InvocationData from '../plugins/data/invocation/InvocationData';
import ThundraSpan from '../opentracing/Span';
import LogData from '../plugins/data/log/LogData';
import { ContextMode } from '../Constants';
import { ApplicationInfo } from '../application/ApplicationInfo';
import ConfigNames from '../config/ConfigNames';
import ConfigProvider from '../config/ConfigProvider';
import Utils from '../utils/Utils';

/**
 * Represents the scope of execution (request, invocation, etc ...)
 * and holds scope specific data.
 */
export default class ExecutionContext {

    startTimestamp: number;
    finishTimestamp: number;
    tracer: ThundraTracer;
    reports: any[];
    triggerClassName: string;
    triggerOperationName: string;
    transactionId: string;
    spanId: string;
    traceId: string;
    rootSpan: ThundraSpan;
    invocationData: InvocationData;
    metrics: any;
    userTags: any;
    tags: any;
    error: any;
    userError: any;
    platformData: any;
    response: any;
    request: any;
    incomingTraceLinks: any[];
    outgoingTraceLinks: any[];
    applicationResourceName: string;
    applicationId: string;
    captureLog: boolean;
    logs: LogData[];
    reportingDisabled: boolean;
    timeout: boolean;
    parentContext: ExecutionContext;
    compatibleContextModes: ContextMode[] = [];
    applicationInfo: ApplicationInfo;

    constructor(opts: any = {}) {
        this.startTimestamp = opts.startTimestamp || 0;
        this.finishTimestamp = opts.finishTimestamp || 0;
        this.tracer = opts.tracer || null;
        this.reports = opts.reports || [];
        this.transactionId = opts.transactionId || '';
        this.spanId = opts.spanId || '';
        this.traceId = opts.traceId || null;
        this.rootSpan = opts.rootSpan || null;
        this.invocationData = opts.invocationData || null;
        this.userTags = opts.userTags || {};
        this.tags = opts.tags || {};
        this.error = opts.error || null;
        this.userError = opts.userError || null;
        this.platformData = opts.platformData || {};
        this.response = opts.response || {};
        this.request = opts.request || {};
        this.incomingTraceLinks = opts.incomingTraceLinks || [];
        this.outgoingTraceLinks = opts.outgoingTraceLinks || [];
        this.captureLog = opts.captureLog || true;
        this.logs = opts.logs || [];
        this.metrics = opts.metric || {};
        this.triggerOperationName = opts.triggerOperationName || '';
        this.applicationResourceName = opts.applicationResourceName || '';
        this.applicationId = opts.applicationId || '';
        this.timeout = false;
        this.parentContext = opts.parentContext;

        if (opts.applicationInfo) {
            this.applicationInfo = Utils.mergeApplicationInfo(Utils.getAppInfoFromConfig(), opts.applicationInfo);
        }

        this.initContextMode();
    }

    isContextCompatibleWith(contextMode: ContextMode) {

        return this.compatibleContextModes.includes(contextMode);
    }

    /**
     * Adds data to be reported
     * @param data data to be reported
     */
    report(data: any) {
        this.reports = [...this.reports, data];
    }

    /**
     * Summarizes the {@link ExecutionContext}
     * @return {string} summary of the {@link ExecutionContext}
     */
    summary(): any {
        return {
            startTimestamp: this.startTimestamp,
            finishTimestamp: this.finishTimestamp,
            triggerClassName: this.triggerClassName,
            transactionId: this.transactionId,
            spanId: this.spanId,
            traceId: this.traceId,
            error: this.error,
            userError: this.userError,
            platformData: this.platformData,
            response: this.response,
        };
    }

    setError(error: any) {
        this.error = error;
    }

    setExecutionTimeout(timeout: boolean) {
        this.timeout = timeout;
    }

    getApplicationInfo(): ApplicationInfo {
        return this.applicationInfo;
    }

    getContextInformation(): any  {

        return {
            applicationId: this.applicationInfo ? this.applicationInfo.applicationId : '',
            applicationClassName: this.applicationInfo ? this.applicationInfo.applicationClassName : '',
            applicationDomainName: this.applicationInfo ? this.applicationInfo.applicationDomainName : '',
        };
    }

    getAdditionalStartTags(): any {

        return {
        };
    }

    getAdditionalFinishTags(): any  {

        return {
        };
    }

    protected initContextMode() {

        this.compatibleContextModes.push(ContextMode.GlobalMode);
        this.compatibleContextModes.push(ContextMode.AsyncMode);
    }
}
