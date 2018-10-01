import MetricData from './MetricData';

class IOMetric extends MetricData {
    metricName: string = 'IOMetric';
    metrics: {
        'sys.diskReadBytes': number,
        'sys.diskWriteBytes': number,
    };

    constructor() {
        super();
    }
}

export default IOMetric;
