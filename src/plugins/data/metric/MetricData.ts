import BaseMonitoringData from '../base/BaseMonitoringData';

class MetricData extends BaseMonitoringData {
    traceId: string;
    transactionId: string;
    spanId: string;
    metricTimestamp: number;
}

export default MetricData;
