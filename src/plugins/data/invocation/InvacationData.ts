import BasePluginData from '../base/BasePluginData';

class InvocationData extends BasePluginData {
    traceId: string;
    transactionId: string;
    spanId: string;
    functionPlatform: string;
    functionName: string;
    functionRegion: string;
    startTimestamp: string;
    finishTimestamp: string;
    duration: number;
    erroneous: boolean;
    errorType: string;
    errorMessage: string;
    coldStart: boolean;
    timeout: boolean;
    tags: Map<string, any>;
}

export default InvocationData;
