import BaseMonitoringData from '../base/BaseMonitoringData';
import MonitorDataType from '../base/MonitoringDataType';
import ThundraLogger from '../../../ThundraLogger';
import Resource from './Resource';

/**
 * Represents the invocation data
 */
class InvocationData extends BaseMonitoringData {

    traceId: string;
    transactionId: string;
    spanId: string;
    applicationPlatform: string;
    applicationRegion: string;
    startTimestamp: number;
    finishTimestamp: number;
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

    /**
     * Sets tags to the invocation
     * @param tags the tags to be set
     */
    setTags(tags: {[name: string]: any }): void {
        try {
            Object.keys(tags).forEach((name) => {
                this.tags[name] = tags[name];
            });
        } catch (e) {
            ThundraLogger.error(`<InvocationData> Error occurred while setting tags ${tags}:`, e);
        }
    }

    /**
     * Sets user tags to the invocation
     * @param userTags the tags to be set
     */
    setUserTags(userTags: {[name: string]: any }): void {
        try {
            Object.keys(userTags).forEach((name) => {
                this.userTags[name] = userTags[name];
            });
        } catch (e) {
            ThundraLogger.error(`<InvocationData> Error occurred while setting user tags ${userTags}:`, e);
        }
    }

    /**
     * Sets error to the invocation
     * @param error the error to be set
     */
    setError(error: any): void {
        this.erroneous = true;
        this.errorType = error.errorType;
        this.errorMessage = error.errorMessage;
    }

}

export default InvocationData;
