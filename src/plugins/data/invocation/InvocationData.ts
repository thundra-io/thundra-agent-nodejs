import BaseMonitoringData from '../base/BaseMonitoringData';
import MonitorDataType from '../base/MonitoringDataType';
import ThundraLogger from '../../../ThundraLogger';
import Resource from './Resource';

class InvocationData extends BaseMonitoringData {
    traceId: string;
    transactionId: string;
    spanId: string;
    applicationPlatform: string;
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
    userTags: any;
    resources: Resource[];
    incomingTraceLinks: any[];
    outgoingTraceLinks: any[];

    constructor() {
        super(MonitorDataType.INVOCATION);
    }

    setTags(keyValuePairs: {[key: string]: any }): void {
        try {
            Object.keys(keyValuePairs).forEach((key) => {
                this.tags[key] = keyValuePairs[key];
            });
        } catch (e) {
            ThundraLogger.error(e);
        }
    }

    setUserTags(keyValuePairs: {[key: string]: any }): void {
        try {
            Object.keys(keyValuePairs).forEach((key) => {
                this.userTags[key] = keyValuePairs[key];
            });
        } catch (e) {
            ThundraLogger.error(e);
        }
    }

    setError(error: any): void {
        this.erroneous = true;
        this.errorType = error.errorType;
        this.errorMessage = error.errorMessage;
    }
}

export default InvocationData;
