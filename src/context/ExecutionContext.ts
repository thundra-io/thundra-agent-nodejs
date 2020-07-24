import ThundraTracer from '../opentracing/Tracer';
import InvocationData from '../plugins/data/invocation/InvocationData';
import ThundraSpan from '../opentracing/Span';
import LogData from '../plugins/data/log/LogData';

export default class ExecutionContext {
    startTimestamp: number;
    finishTimestamp: number;
    tracer: ThundraTracer;
    reports: any[];
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
    incomingTraceLinks: any[];
    outgoingTraceLinks: any[];
    captureLog: boolean;
    logs: LogData[];

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
        this.incomingTraceLinks = opts.incomingTraceLinks || [];
        this.outgoingTraceLinks = opts.outgoingTraceLinks || [];
        this.captureLog = opts.captureLog || true;
        this.logs = opts.logs || [];
        this.metrics = opts.metric || {};
    }

    report(data: any) {
        this.reports = [...this.reports, data];
    }
}
