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

    /**
     * Summarizes the {@link PluginContext}
     * @return {string} summary of the {@link PluginContext}
     */
    summary(): any {
        return {
            applicationInfo: this.applicationInfo,
            requestCount: this.requestCount,
            timeoutMargin: this.timeoutMargin,
            maxMemory: this.maxMemory,
        };
    }

}

export default PluginContext;
