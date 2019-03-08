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
    invocationStartTimestamp?: number;
    invocationFinishTimestamp?: number;
}

export default PluginContext;
