import MetricData from './MetricData';

/**
 * Represents IO metrics (for ex. disk IO)
 */
class IOMetric extends MetricData {

    readonly metricName: string = 'IOMetric';
    metrics: {
        'sys.diskReadBytes': number,
        'sys.diskWriteBytes': number,
    };

    constructor() {
        super();
    }

}

export default IOMetric;
