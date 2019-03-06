import ThundraConfig from './config/ThundraConfig';

class PluginContext {
    applicationId: string;
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
    config: ThundraConfig;
}

export default PluginContext;
