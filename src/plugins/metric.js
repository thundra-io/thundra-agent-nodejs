import os from "os";
import {execSync} from "child_process";
import {
    formatDate,
    generateId,
    getCpuUsage,
    getCpuLoad,
    readProcStatPromise,
    readProcIoPromise,
} from "./utils";


class Metric {
    constructor(options) {
        this.hooks = {
            "before-invocation": this.beforeInvocation,
            "after-invocation": this.afterInvocation
        };
        this.options = options;
        this.statData = {};
        this.reports = [];
        this.clockTick = parseInt(execSync("getconf CLK_TCK").toString());
    }

    report = (data) => {
        this.reporter.addReport(data);
    };

    setPluginContext =  (pluginContext) => {
        this.pluginContext = pluginContext;
        this.apiKey = pluginContext.apiKey;
    };

    beforeInvocation = async (data) => {
        const [procStat, procIo] = await Promise.all([readProcStatPromise(), readProcIoPromise()]);
        this.initialProcStat = procStat;
        this.initialProcIo = procIo;
        this.reporter = data.reporter;
        this.statData = {
            applicationId: this.pluginContext.applicationId,
            applicationName: data.originalContext.functionName,
            applicationProfile: this.pluginContext.applicationProfile,
            applicationVersion: this.pluginContext.applicationVersion,
            applicationType: "node",
            functionRegion: this.pluginContext.applicationRegion,
            statTime: formatDate(new Date())
        };
        this.startCpuUsage = getCpuUsage();
        this.reports = [];
    };

    afterInvocation = async () => {
        await Promise.all([
            this.addThreadStatReport(),
            this.addMemoryStatReport(),
            this.addCpuStatReport(),
            this.addIoStatReport()
        ]);
        this.reports.forEach(report => {
            this.report(report);
        });
    };

    addThreadStatReport = async () => {
        const {threadCount} = this.initialProcStat;
        const threadStat = {
            ...this.statData,
            id: generateId(),
            statName: "ThreadStat",
            threadCount: threadCount,
        };
        const threadStatReport = {
            data: threadStat,
            type: "StatData",
            apiKey: this.apiKey,
            dataFormatVersion: "1.0"
        };
        this.reports = [...this.reports, threadStatReport];
    };

    addMemoryStatReport = async () => {
        const {rss, heapTotal, heapUsed, external} = process.memoryUsage();
        const totalMemory = os.totalmem();
        const freeMemory = os.freemem();
        const memoryStat = {
            ...this.statData,
            id: generateId(),
            statName: "MemoryStat",
            "proc.rss": rss,
            "proc.heapTotal": heapTotal,
            "proc.heapUsed": heapUsed,
            "proc.external": external,
            "os.totalMemory": totalMemory,
            "os.freeMemory": freeMemory,
            "os.usedMemory": totalMemory - freeMemory
        };
        const memoryStatReport = {
            data: memoryStat,
            type: "StatData",
            apiKey: this.apiKey,
            dataFormatVersion: "1.0"
        };
        this.reports = [...this.reports, memoryStatReport];
    };

    addCpuStatReport = async () => {
        const endCpuUsage = getCpuUsage();
        const cpuLoad = getCpuLoad(this.startCpuUsage, endCpuUsage, this.clockTick);
        const cpuStat = {
            ...this.statData,
            id: generateId(),
            statName: "CpuStat",
            "processCpuLoad": cpuLoad.procCpuLoad,
            "systemCpuLoad": cpuLoad.sysCpuLoad,
        };
        const cpuStatReport = {
            data: cpuStat,
            type: "StatData",
            apiKey: this.apiKey,
            dataFormatVersion: "1.0"
        };
        this.reports = [...this.reports, cpuStatReport];
    };

    addIoStatReport = async () => {
        const startProcIo = this.initialProcIo;
        const endProcIo = await readProcIoPromise();
        const ioStat = {
            ...this.statData,
            statName: "IoStat",
            id: generateId(),
            "proc.diskReadBytes": endProcIo.readBytes - startProcIo.readBytes,
            "proc.diskWriteBytes": endProcIo.writeBytes - startProcIo.writeBytes
        };
        const ioStatReport = {
            data: ioStat,
            type: "StatData",
            apiKey: this.apiKey,
            dataFormatVersion: "1.0"
        };
        this.reports = [...this.reports, ioStatReport];
    };

}

export default function instantiateMetricPlugin(options) {
    return new Metric(options);
};