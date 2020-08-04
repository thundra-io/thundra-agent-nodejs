import { ApplicationInfo } from '../application/ApplicationInfo';

/**
 * Global context to be used and between shared by plugins
 */
class PluginContext {

    applicationInfo: ApplicationInfo;
    requestCount: number;
    apiKey: string;
    timeoutMargin: number;
    maxMemory: number;
    executor: any;

    constructor(opt: any = {}) {
        this.requestCount = opt.requestCount;
        this.apiKey = opt.apiKey;
        this.timeoutMargin = opt.timeoutMargin;
        this.executor = opt.executor;
        this.applicationInfo = opt.applicationInfo;
    }

}

export default PluginContext;
