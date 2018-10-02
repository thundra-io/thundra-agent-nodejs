import * as os from 'os';
import { execSync } from 'child_process';
import MetricData from './data/metric/MetricData';
import Utils from './Utils';
import ThreadMetric from './data/metric/ThreadMetric';
import MemoryMetric from './data/metric/MemoryMetric';
import IOMetric from './data/metric/IOMetric';
import CPUMetric from './data/metric/CPUMetric';
import MetricConfig from './config/MetricConfig';
import MonitoringDataType from './data/base/MonitoringDataType';
import PluginContext from './PluginContext';
import ThundraTracer from '../opentracing/Tracer';
import ThundraLogger from '../ThundraLogger';

class Metric {
    hooks: { 'before-invocation': (data: any) => Promise<void>; 'after-invocation': () => Promise<void>; };
    options: MetricConfig;
    metricData: MetricData;
    reports: any[];
    clockTick: number;
    reporter: any;
    pluginContext: PluginContext;
    apiKey: any;
    initialProcMetric: any;
    initialProcIo: any;
    startCpuUsage: { procCpuUsed: number; sysCpuUsed: number; sysCpuTotal: number; };
    tracer: ThundraTracer;

    constructor(options: MetricConfig) {
        this.hooks = {
            'before-invocation': this.beforeInvocation,
            'after-invocation': this.afterInvocation,
        };
        this.options = options;
        this.reports = [];
        this.clockTick = parseInt(execSync('getconf CLK_TCK').toString(), 0);
        this.tracer = ThundraTracer.getInstance();
    }

    report(data: any): void {
        this.reporter.addReport(data);
    }

    setPluginContext(pluginContext: PluginContext) {
        this.pluginContext = pluginContext;
        this.apiKey = pluginContext.apiKey;
    }

    beforeInvocation = async (data: any) => {
        const { originalContext } = data;

        const [procMetric, procIo] = await Promise.all([Utils.readProcMetricPromise(), Utils.readProcIoPromise()]);
        this.initialProcMetric = procMetric;
        this.initialProcIo = procIo;
        this.reporter = data.reporter;

        this.metricData = Utils.initMonitoringData(this.pluginContext,
            originalContext, MonitoringDataType.METRIC) as MetricData;
        this.metricData.metricTimestamp = Date.now();

        const activeSpan = this.tracer.getActiveSpan();
        this.metricData.transactionId = this.pluginContext.transactionId ?
            this.pluginContext.transactionId : originalContext.awsRequestId;
        this.metricData.spanId = activeSpan ? activeSpan.spanContext.spanId : '';
        this.metricData.traceId = activeSpan ? activeSpan.spanContext.traceId : '';

        this.startCpuUsage = Utils.getCpuUsage();
        this.reports = [];
    }

    afterInvocation = async () => {
        await Promise.all([
            this.addThreadMetricReport(),
            this.addMemoryMetricReport(),
            this.addCpuMetricReport(),
            this.addIoMetricReport(),
        ]).catch((err: Error) => {
            ThundraLogger.getInstance().error('Cannot obtain metric data :' + err);
        });
        this.reports.forEach((report) => {
            this.report(report);
        });
    }

    addThreadMetricReport = async () => {
        const { threadCount } = this.initialProcMetric;

        const threadMetric = new ThreadMetric();
        threadMetric.initWithMetricMonitoringDataValues(this.metricData);
        threadMetric.id = Utils.generateId();
        threadMetric.metricTimestamp = Date.now();

        threadMetric.metrics = {
            'app.threadCount': threadCount,
        };

        const threadMetricReport = Utils.generateReport(threadMetric, this.apiKey);
        this.reports = [...this.reports, threadMetricReport];
    }

    addMemoryMetricReport = async () => {
        const { rss, heapTotal, heapUsed, external } = process.memoryUsage();
        const totalMemory = os.totalmem();
        const freeMemory = os.freemem();

        const memoryMetric = new MemoryMetric();
        memoryMetric.initWithMetricMonitoringDataValues(this.metricData);
        memoryMetric.id = Utils.generateId();
        memoryMetric.metricTimestamp = Date.now();

        memoryMetric.metrics = {
            'app.maxMemory': heapTotal,
            'app.usedMemory': heapUsed,
            'app.rss': rss,
            'sys.maxMemory': totalMemory,
            'sys.usedMemory': totalMemory - freeMemory,
            'sys.external': external,
            'sys.freeMemory': freeMemory,
        };

        const memoryMetricReport = Utils.generateReport(memoryMetric, this.apiKey);
        this.reports = [...this.reports, memoryMetricReport];
    }

    addCpuMetricReport = async () => {
        const endCpuUsage = Utils.getCpuUsage();
        const cpuLoad = Utils.getCpuLoad(this.startCpuUsage, endCpuUsage, this.clockTick);

        const cpuMetric = new CPUMetric();
        cpuMetric.initWithMetricMonitoringDataValues(this.metricData);
        cpuMetric.id = Utils.generateId();
        cpuMetric.metricTimestamp = Date.now();

        cpuMetric.metrics = {
            'app.cpuLoad': cpuLoad.procCpuLoad,
            'sys.cpuLoad': cpuLoad.sysCpuLoad,
        };

        const cpuMetricReport = Utils.generateReport(cpuMetric, this.apiKey);
        this.reports = [...this.reports, cpuMetricReport];
    }

    addIoMetricReport = async () => {
        const startProcIo = this.initialProcIo;
        const endProcIo: any = await Utils.readProcIoPromise();

        const ioMetric = new IOMetric();
        ioMetric.initWithMetricMonitoringDataValues(this.metricData);
        ioMetric.id = Utils.generateId();
        ioMetric.metricTimestamp = Date.now();

        ioMetric.metrics = {
            'sys.diskReadBytes': endProcIo.readBytes - startProcIo.readBytes,
            'sys.diskWriteBytes': endProcIo.writeBytes - startProcIo.writeBytes,
        };

        const ioMetricReport = Utils.generateReport(ioMetric, this.apiKey);
        this.reports = [...this.reports, ioMetricReport];
    }
}

export default function instantiateMetricPlugin(config: MetricConfig) {
    return new Metric(config);
}
