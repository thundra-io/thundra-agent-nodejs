import BaseMonitoringData from '../base/BaseMonitoringData';
import MonitorDataType from '../base/MonitoringDataType';

class TraceData extends BaseMonitoringData {
    duration: number;
    rootSpanId: string;
    startTimestamp: number;
    finishTimestamp: number;
    tags: any;

    constructor() {
        super(MonitorDataType.TRACE);
    }
}

export default TraceData;
