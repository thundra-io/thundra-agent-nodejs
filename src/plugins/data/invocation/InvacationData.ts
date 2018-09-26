import BaseMonitoringData from '../base/BaseMonitoringData';

class InvocationData extends BaseMonitoringData {
    traceId: string;
    transactionId: string;
    spanId: string;
    functionPlatform: string;
    functionName: string;
    functionRegion: string;
    startTimestamp: number;
    finishTimestamp: number ;
    duration: number;
    erroneous: boolean;
    errorType: string;
    errorMessage: string;
    coldStart: boolean;
    timeout: boolean;
    tags: any;
}

export default InvocationData;
