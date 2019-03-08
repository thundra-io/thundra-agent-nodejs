import ThundraConfig from './config/ThundraConfig';

class PluginContext {
    applicationId: string;
    applicationRegion: string;
    applicationVersion: string;
    requestCount: number;
    apiKey: string;
    timeoutMargin: number;
    config: ThundraConfig;
    reporter?: any;
    spanId?: string;
    traceId?: string;
    transactionId?: string;
    error?: Error;
    maxMemory?: number;
    private $invocationStartTimestamp?: number;
    private $invocationFinishTimestamp?: number;

    constructor(opt: any) {
        opt = opt ? opt : {};
        this.applicationId = opt.applicationId;
        this.applicationRegion = opt.applicationRegion;
        this.applicationVersion = opt.applicationVersion;
        this.requestCount = opt.requestCount;
        this.apiKey = opt.apiKey;
        this.timeoutMargin = opt.timeoutMargin;
        this.transactionId = opt.transactionId;
        this.config = opt.config;
    }

    get invocationStartTimestamp(): number {
        if (!this.$invocationStartTimestamp) {
            this.$invocationStartTimestamp = Date.now();
        }
        return this.$invocationStartTimestamp;
    }

    set invocationStartTimestamp(invocationStartTimestamp: number) {
         this.$invocationStartTimestamp = invocationStartTimestamp;
    }

    get invocationFinishTimestamp(): number {
        if (!this.$invocationFinishTimestamp) {
            this.$invocationFinishTimestamp = Date.now();
        }
        return this.$invocationFinishTimestamp;
    }

    set invocationFinishTimestamp(invocationFinishTimestamp: number) {
         this.$invocationFinishTimestamp = invocationFinishTimestamp;
    }
}

export default PluginContext;
