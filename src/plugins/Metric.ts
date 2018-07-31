import * as os from 'os';
import {execSync} from 'child_process';
import MetricData from './data/metric/MetricData';
import Utils from './Utils';
import ThreadMetric from './data/metric/ThreadMetric';
import MemoryMetric from './data/metric/MemoryMetric';
import IOMetric from './data/metric/IOMetric';
import CPUMetric from './data/metric/CPUMetric';
import MetricConfig from './config/MetricConfig';

class Metric {
    public hooks: { 'before-invocation': (data: any) => Promise<void>; 'after-invocation': () => Promise<void>; };
    public options: any;
    public dataType: string;
    public statData: MetricData;
    public reports: any[];
    public clockTick: number;
    public reporter: any;
    public pluginContext: any;
    public apiKey: any;
    public initialProcStat: any;
    public initialProcIo: any;
    public startCpuUsage: { procCpuUsed: number; sysCpuUsed: number; sysCpuTotal: number; };

    constructor(options: any) {
        this.hooks = {
            'before-invocation': this.beforeInvocation,
            'after-invocation': this.afterInvocation,
        };
        this.options = options;
        this.dataType = 'StatData';
        this.statData = new MetricData();
        this.reports = [];
        this.clockTick = parseInt(execSync('getconf CLK_TCK').toString(), 0);
    }

    report(data: any): void {
        this.reporter.addReport(data);
    }

    setPluginContext = (pluginContext: any) => {
        this.pluginContext = pluginContext;
        this.apiKey = pluginContext.apiKey;
    }

    beforeInvocation = async (data: any) => {
        const [procStat, procIo] = await Promise.all([Utils.readProcStatPromise(), Utils.readProcIoPromise()]);
        this.initialProcStat = procStat;
        this.initialProcIo = procIo;
        this.reporter = data.reporter;

        this.statData.transactionId = data.transactionId,
        this.statData.rootExecutionAuditContextId = data.contextId,
        this.statData.applicationId = this.pluginContext.applicationId,
        this.statData.applicationName = data.originalContext.functionName,
        this.statData.applicationProfile = this.pluginContext.applicationProfile,
        this.statData.applicationVersion = this.pluginContext.applicationVersion,
        this.statData.functionRegion = this.pluginContext.applicationRegion,
        this.statData.statTimestamp = Date.now(),
        this.startCpuUsage = Utils.getCpuUsage();
        this.reports = [];
    }

    afterInvocation = async () => {
        await Promise.all([
            this.addThreadStatReport(),
            this.addMemoryStatReport(),
            this.addCpuStatReport(),
            this.addIoStatReport(),
        ]);
        this.reports.forEach((report) => {
            this.report(report);
        });
    }

    addThreadStatReport = async () => {
        const {threadCount} = this.initialProcStat;

        const threadMetric = new ThreadMetric();
        threadMetric.id = Utils.generateId();
        threadMetric.threadCount = threadCount;

        const threadStat = {
            ...this.statData,
            ...threadMetric,
        };
        const threadStatReport = Utils.generateReport(threadStat, this.dataType, this.apiKey);
        this.reports = [...this.reports, threadStatReport];
    }

    addMemoryStatReport = async () => {
        const {rss, heapTotal, heapUsed, external} = process.memoryUsage();
        const totalMemory = os.totalmem();
        const freeMemory = os.freemem();

        const memoryMetric = new MemoryMetric();
        memoryMetric.id = Utils.generateId();
        memoryMetric['proc.rss'] = rss;
        memoryMetric['proc.heapTotal'] = heapTotal;
        memoryMetric['proc.heapUsed'] = heapUsed;
        memoryMetric['proc.external'] = external;
        memoryMetric['os.totalMemory'] = totalMemory;
        memoryMetric['os.freeMemory'] = freeMemory;
        memoryMetric['os.usedMemory'] = totalMemory - freeMemory;

        const memoryStat = {
            ...this.statData,
            ...memoryMetric,
        };
        const memoryStatReport = Utils.generateReport(memoryStat, this.dataType, this.apiKey);
        this.reports = [...this.reports, memoryStatReport];
    }

    addCpuStatReport = async () => {
        const endCpuUsage = Utils.getCpuUsage();
        const cpuLoad = Utils.getCpuLoad(this.startCpuUsage, endCpuUsage, this.clockTick);

        const cpuMetric = new CPUMetric();
        cpuMetric.id = Utils.generateId();
        cpuMetric.processCpuLoad = cpuLoad.procCpuLoad;
        cpuMetric.systemCpuLoad = cpuLoad.sysCpuLoad;

        const cpuStat = {
            ...this.statData,
            ...cpuMetric,
        };
        const cpuStatReport = Utils.generateReport(cpuStat, this.dataType, this.apiKey);
        this.reports = [...this.reports, cpuStatReport];
    }

    addIoStatReport = async () => {
        const startProcIo = this.initialProcIo;
        const endProcIo: any = await Utils.readProcIoPromise();

        const ioMetric = new IOMetric();
        ioMetric.id = Utils.generateId();
        ioMetric['proc.diskReadBytes'] = endProcIo.readBytes - startProcIo.readBytes;
        ioMetric['proc.diskWriteBytes'] = endProcIo.writeBytes - startProcIo.writeBytes;

        const ioStat = {
            ...this.statData,
            ...ioMetric,
        };
        const ioStatReport = Utils.generateReport(ioStat, this.dataType, this.apiKey);
        this.reports = [...this.reports, ioStatReport];
    }
}

export default function instantiateMetricPlugin(config: MetricConfig) {
    return new Metric(config);
}
