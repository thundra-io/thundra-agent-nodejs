import BaseMonitoringData from '../base/BaseMonitoringData';
import MonitorDataType from '../base/MonitoringDataType';

class MetricData extends BaseMonitoringData {
    traceId: string;
    transactionId: string;
    spanId: string;
    metricTimestamp: number;

    constructor() {
        super(MonitorDataType.METRIC);
    }

    initWithMetricMonitoringDataValues(data: MetricData) {
        this.initWithBaseMonitoringDataValues(data);
        this.traceId = data.traceId;
        this.transactionId = data.transactionId;
        this.spanId = data.spanId;
    }
}

export default MetricData;
