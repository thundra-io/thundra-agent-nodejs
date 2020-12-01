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
    applicationResourceName: string;
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
     * Checks whether invocation has finished
     *
     * @return {@code true} invocation has finished,
     *         {@code false} otherwise
     */
    isFinished(): boolean {
        return this.finishTimestamp > 0;
    }

    /**
     * Finished invocation if it is not finished yet
     * @param {number} finishTimestamp the optional finish timestamp.
     *        If it is not specified, current time will be used
     */
    finish(finishTimestamp?: number): void {
        if (!this.isFinished()) {
            if (!finishTimestamp) {
                finishTimestamp = Date.now();
            }
            this.finishTimestamp = finishTimestamp;
            this.duration = finishTimestamp - this.startTimestamp;
        }
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
