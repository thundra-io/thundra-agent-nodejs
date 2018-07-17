class CPUMetric {
    id: string;
    readonly statName: string = 'CpuStat';
    processCpuLoad: number;
    systemCpuLoad: number;
}

export default CPUMetric;
