import MetricData from './MetricData';

class ThreadMetric extends MetricData {
    readonly metricName: string = 'ThreadMetric';
    metrics: {
        'app.threadCount': number;
    };
}

export default ThreadMetric;
