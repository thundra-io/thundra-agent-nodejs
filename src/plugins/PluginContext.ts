
class PluginContext {

    applicationId: string;
    applicationInstanceId: string;
    applicationName: string;
    applicationRegion: string;
    applicationVersion: string;
    requestCount: number;
    apiKey: string;
    timeoutMargin: number;
    maxMemory: number;
    executor: any;

    constructor(opt: any) {
        opt = opt ? opt : {};
        this.applicationId = opt.applicationId;
        this.applicationInstanceId = opt.applicationInstanceId;
        this.applicationName = opt.applicationName;
        this.applicationRegion = opt.applicationRegion;
        this.applicationVersion = opt.applicationVersion;
        this.requestCount = opt.requestCount;
        this.apiKey = opt.apiKey;
        this.timeoutMargin = opt.timeoutMargin;
        this.executor = opt.executor;
    }

}

export default PluginContext;
