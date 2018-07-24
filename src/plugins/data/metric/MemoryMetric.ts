class MemoryMetric {
    id: string;
    readonly statName: string = 'MemoryStat';
    'proc.rss': number;
    'proc.heapTotal': number;
    'proc.heapUsed': number;
    'proc.external': number;
    'os.totalMemory': number;
    'os.freeMemory': number;
    'os.usedMemory': number;
}

export default MemoryMetric;
