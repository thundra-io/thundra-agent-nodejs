import * as os from 'os';
import { execSync } from 'child_process';
import MetricData from './data/metric/MetricData';
import Utils from './utils/Utils';
import ThreadMetric from './data/metric/ThreadMetric';
import MemoryMetric from './data/metric/MemoryMetric';
import IOMetric from './data/metric/IOMetric';
import CPUMetric from './data/metric/CPUMetric';
import MetricConfig from './config/MetricConfig';
import MonitoringDataType from './data/base/MonitoringDataType';
import PluginContext from './PluginContext';
import ThundraLogger from '../ThundraLogger';
import {ApplicationManager} from '../application/ApplicationManager';
import InvocationTraceSupport from './support/InvocationTraceSupport';
import Reporter from '../Reporter';

export default class Metric {
    hooks: { 'before-invocation': (pluginContext: PluginContext) => Promise<void>;
            'after-invocation': (pluginContext: PluginContext) => Promise<void>; };
    config: MetricConfig;
    metricData: MetricData;
    reports: any[];
    clockTick: number;
    initialProcMetric: any;
    initialProcIo: any;
    startCpuUsage: { procCpuUsed: number; sysCpuUsed: number; sysCpuTotal: number; };
    pluginOrder: number = 2;
    sampled: boolean = true;

    constructor(config: MetricConfig) {
        this.hooks = {
            'before-invocation': this.beforeInvocation,
            'after-invocation': this.afterInvocation,
        };
        this.config = config;
        this.reports = [];
        this.clockTick = parseInt(execSync('getconf CLK_TCK').toString(), 0);
    }

    report(data: any, reporter: Reporter): void {
        if (reporter) {
            reporter.addReport(data);
        }
    }

    beforeInvocation = async (pluginContext: PluginContext) => {
        this.reports = [];

        const isSamplerPresent = this.config && this.config.sampler && typeof(this.config.sampler.isSampled) === 'function';
        this.sampled = isSamplerPresent ? this.config.sampler.isSampled() : true;

        if (this.sampled) {
            const [procMetric, procIo] = await Promise.all([Utils.readProcMetricPromise(), Utils.readProcIoPromise()]);
            this.initialProcMetric = procMetric;
            this.initialProcIo = procIo;

            this.metricData = Utils.initMonitoringData(pluginContext, MonitoringDataType.METRIC) as MetricData;
            this.metricData.metricTimestamp = Date.now();
            this.metricData.tags['aws.region'] = pluginContext.applicationRegion;

            const activeSpan = InvocationTraceSupport.getActiveSpan();
            this.metricData.transactionId = pluginContext.transactionId ?
                pluginContext.transactionId : ApplicationManager.getPlatformUtils().getTransactionId();
            this.metricData.spanId = activeSpan ? activeSpan.spanContext.spanId : '';
            this.metricData.traceId = activeSpan ? activeSpan.spanContext.traceId : '';

            this.startCpuUsage = Utils.getCpuUsage();
        }
    }

    afterInvocation = async (pluginContext: PluginContext) => {
        if (this.sampled) {
            const { apiKey, reporter, maxMemory } = pluginContext;

            await Promise.all([
                this.addThreadMetricReport(apiKey),
                this.addMemoryMetricReport(apiKey, maxMemory),
                this.addCpuMetricReport(apiKey),
                this.addIoMetricReport(apiKey),
            ]).catch((err: Error) => {
                ThundraLogger.error('Cannot obtain metric data :' + err);
            });

            this.reports.forEach((report) => {
                this.report(report, reporter);
            });
        }
    }

    addThreadMetricReport = async (apiKey: string) => {
        const { threadCount } = this.initialProcMetric;

        const threadMetric = new ThreadMetric();
        threadMetric.initWithMetricMonitoringDataValues(this.metricData);
        threadMetric.id = Utils.generateId();
        threadMetric.metricTimestamp = Date.now();

        threadMetric.metrics = {
            'app.threadCount': threadCount,
        };

        const threadMetricReport = Utils.generateReport(threadMetric, apiKey);
        this.reports = [...this.reports, threadMetricReport];
    }

    addMemoryMetricReport = async (apiKey: string, maxMemory: number) => {
        const { rss, heapUsed, external } = process.memoryUsage();
        const totalMemory = os.totalmem();
        const freeMemory = os.freemem();

        const memoryMetric = new MemoryMetric();
        memoryMetric.initWithMetricMonitoringDataValues(this.metricData);
        memoryMetric.id = Utils.generateId();
        memoryMetric.metricTimestamp = Date.now();

        memoryMetric.metrics = {
            'app.maxMemory': maxMemory * 1024 * 1024,
            'app.usedMemory': heapUsed,
            'app.rss': rss,
            'sys.maxMemory': totalMemory,
            'sys.usedMemory': totalMemory - freeMemory,
            'sys.external': external,
            'sys.freeMemory': freeMemory,
        };

        const memoryMetricReport = Utils.generateReport(memoryMetric, apiKey);
        this.reports = [...this.reports, memoryMetricReport];
    }

    addCpuMetricReport = async (apiKey: string) => {
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

        const cpuMetricReport = Utils.generateReport(cpuMetric, apiKey);
        this.reports = [...this.reports, cpuMetricReport];
    }

    addIoMetricReport = async (apiKey: string) => {
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

        const ioMetricReport = Utils.generateReport(ioMetric, apiKey);
        this.reports = [...this.reports, ioMetricReport];
    }
}
