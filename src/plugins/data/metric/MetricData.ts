import BaseMonitoringData from '../base/BaseMonitoringData';
import MonitorDataType from '../base/MonitoringDataType';

/**
 * Represents metric (for ex. CPU usage, memory usage, ...) data
 */
class MetricData extends BaseMonitoringData {

    traceId: string;
    transactionId: string;
    spanId: string;
    metricTimestamp: number;
    tags: any = {};

    constructor() {
        super(MonitorDataType.METRIC);
    }

    /**
     * Initializes with given values
     * @param {MetricData} data the base {@link MetricData} to be initialize from
     * @param {string} traceId the associated trace id
     * @param {string} transactionId the associated transaction id
     * @param {string} spanId the associated span id
     */
    initWithMetricMonitoringDataValues(data: MetricData, traceId: string, transactionId: string, spanId: string) {
        this.initWithBaseMonitoringDataValues(data);
        this.traceId = traceId;
        this.transactionId = transactionId;
        this.spanId = spanId;
        this.tags = data.tags;
    }

}

export default MetricData;
