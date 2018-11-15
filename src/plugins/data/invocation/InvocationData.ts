import BaseMonitoringData from '../base/BaseMonitoringData';
import MonitorDataType from '../base/MonitoringDataType';
import ThundraLogger from '../../../ThundraLogger';

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

    constructor() {
        super(MonitorDataType.INVOCATION);
    }

    setTags(keyValuePairs: {[key: string]: any }): void {
        try {
            Object.keys(keyValuePairs).forEach((key) => {
              this.tags[key] = keyValuePairs[key];
            });
        } catch (e) {
            ThundraLogger.getInstance().error(e);
        }
    }
}

export default InvocationData;
