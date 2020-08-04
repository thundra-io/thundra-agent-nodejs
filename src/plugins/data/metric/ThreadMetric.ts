import MetricData from './MetricData';

/**
 * Represents thread metrics (for ex. thread count)
 */
class ThreadMetric extends MetricData {

    readonly metricName: string = 'ThreadMetric';
    metrics: {
        'app.threadCount': number;
    };

    constructor() {
        super();
    }

}

export default ThreadMetric;
