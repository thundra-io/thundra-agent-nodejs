import MetricData from './MetricData';

/**
 * Represents memory metrics (for ex. memory usage)
 */
class MemoryMetric extends MetricData {

    readonly metricName: string = 'MemoryMetric';
    metrics: {
        'app.maxMemory': number;
        'app.usedMemory': number;
        'app.rss': number;
        'sys.maxMemory': number;
        'sys.usedMemory': number;
        'sys.external': number
        'sys.freeMemory': number;
    };

    constructor() {
        super();
    }

}

export default MemoryMetric;
