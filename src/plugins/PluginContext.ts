
class PluginContext {
    applicationId: string;
    applicationInstanceId: string;
    applicationRegion: string;
    applicationVersion: string;
    requestCount: number;
    apiKey: string;
    timeoutMargin: number;
    reporter?: any;
    spanId?: string;
    traceId?: string;
    transactionId?: string;
    error?: Error;
    maxMemory?: number;
    executor: any;

    constructor(opt: any) {
        opt = opt ? opt : {};
        this.applicationId = opt.applicationId;
        this.applicationInstanceId = opt.applicationInstanceId;
        this.applicationRegion = opt.applicationRegion;
        this.applicationVersion = opt.applicationVersion;
        this.requestCount = opt.requestCount;
        this.apiKey = opt.apiKey;
        this.timeoutMargin = opt.timeoutMargin;
        this.transactionId = opt.transactionId;
        this.executor = opt.executor;
    }

}

export default PluginContext;
