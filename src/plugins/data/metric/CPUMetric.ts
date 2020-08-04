import MetricData from './MetricData';

/**
 * Represents CPU metrics (for ex. CPU usage)
 */
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
