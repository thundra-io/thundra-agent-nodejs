import BaseMonitoringData from '../base/BaseMonitoringData';
import MonitorDataType from '../base/MonitoringDataType';

class SpanData extends BaseMonitoringData {
    traceId: string;
    transactionId: string;
    parentSpanId: string;
    spanOrder: number;
    domainName: string;
    className: string;
    serviceName: string;
    operationName: string;
    startTimestamp: number;
    finishTimestamp: number;
    duration: number;
    tags: any;
    logs: any;

    constructor() {
        super(MonitorDataType.SPAN);
    }
}

export default SpanData;
