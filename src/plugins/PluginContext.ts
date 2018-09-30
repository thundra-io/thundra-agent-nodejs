class PluginContext {
    applicationId: string;
    applicationProfile: string;
    applicationRegion: string;
    applicationVersion: string;
    requestCount: number;
    apiKey: string;
    skipHttpResponseCheck: boolean;
    timeoutMargin: number;
    reporter?: any;
    spanId?: string;
    traceId?: string;
    transactionId?: string;
    error?: Error;
}

export default PluginContext;
