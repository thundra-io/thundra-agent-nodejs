import MetricData from './MetricData';

class CPUMetric extends MetricData {
    readonly metricName: string = 'CPUMetric';
    metrics: {
        'app.cpuLoad': number,
        'sys.cpuLoad': number,
    };

    constructor() {
        super();
    }
}

export default CPUMetric;
