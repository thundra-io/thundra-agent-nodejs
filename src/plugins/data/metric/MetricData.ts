import BaseMonitoringData from '../base/BaseMonitoringData';
import MonitorDataType from '../base/MonitoringDataType';

class MetricData extends BaseMonitoringData {
    traceId: string;
    transactionId: string;
    spanId: string;
    metricTimestamp: number;
    tags: any = {};

    constructor() {
        super(MonitorDataType.METRIC);
    }

    initWithMetricMonitoringDataValues(data: MetricData, traceId: string, transactionId: string, spanId: string) {
        this.initWithBaseMonitoringDataValues(data);
        this.traceId = traceId;
        this.transactionId = transactionId;
        this.spanId = spanId;
        this.tags = data.tags;
    }
}

export default MetricData;
