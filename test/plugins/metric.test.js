import Metric from '../../dist/plugins/Metric';
import {createMockPluginContext, createMockBeforeInvocationData} from '../mocks/mocks';
import {DATA_MODEL_VERSION,LAMBDA_APPLICATION_CLASS_NAME,LAMBDA_APPLICATION_DOMAIN_NAME} from '../../dist/Constants';

import Utils from '../../dist/plugins/Utils';

Utils.readProcIoPromise = jest.fn(() => {
    return new Promise((resolve, reject) => {
        return resolve({readBytes: 1024, writeBytes: 4096});
    });
});

Utils.readProcMetricPromise = jest.fn(() => {
    return new Promise((resolve, reject) => {
        return resolve({threadCount: 10});
    });
});

const pluginContext = createMockPluginContext();
describe('Metrics', () => {

    describe('Export function', () => {
        const options = {opt1: 'opt1', opt2: 'opt2'};
        const metric = Metric(options);
        metric.setPluginContext(pluginContext);
        it('should export a function which returns an object', () => {
            expect(typeof Metric).toEqual('function');
            expect(typeof metric).toEqual('object');
        });
        it('should be able to pass options', () => {
            expect(metric.options).toEqual(options);
        });
    });

    describe('Constructor', () => {
        const options = {op1t: 'opt1', opt2: 'opt2'};
        const metric = Metric();
        const metricWithOptions = Metric(options);
        
        it('Should have the same HOOKS', () => {
            expect(metric.hooks).toEqual({
                'before-invocation': metric.beforeInvocation,
                'after-invocation': metric.afterInvocation
            });
        });
        it('Should be able to initialize variables without options', () => {
            expect(metric.reports).toEqual([]);
            expect(metric.options).toEqual(undefined);
        });
        it('Should be able to initialize variables with options', () => {
            expect(metricWithOptions.reports).toEqual([]);
            expect(metricWithOptions.options).toEqual(options);

        });
        it('Should get clock tick', () => {
            expect(metric.clockTick).toBeTruthy();
            expect(metricWithOptions.clockTick).toBeTruthy();
        });

    });


    describe('setPluginContext', () => {
        const metric = Metric();
        metric.setPluginContext(pluginContext);
        it('Should set apiKey and pluginContext',() => {
            expect(metric.apiKey).toEqual(pluginContext.apiKey);
            expect(metric.pluginContext).toEqual(pluginContext);
        });
    });

    describe('beforeInvocation', () => {
        const metric = Metric();
        metric.setPluginContext(pluginContext);
        const beforeInvocationData = createMockBeforeInvocationData();

        it('Should set variables to their initial value', async () => {
            await metric.beforeInvocation(beforeInvocationData);
            expect(Utils.readProcIoPromise).toBeCalled();
            expect(Utils.readProcMetricPromise).toBeCalled();
            expect(metric.initialProcMetric).toEqual({threadCount: 10});
            expect(metric.initialProcIo).toEqual({readBytes: 1024, writeBytes: 4096});
            expect(metric.reporter).toBe(beforeInvocationData.reporter);
            expect(metric.apiKey).toBe(pluginContext.apiKey);
            expect(metric.reports).toEqual([]);
            expect(metric.startCpuUsage).toBeDefined();
            expect(metric.metricData.metricTimestamp).toBeDefined();

            expect(metric.metricData.applicationClassName).toEqual(LAMBDA_APPLICATION_CLASS_NAME);
            expect(metric.metricData.applicationDomainName).toEqual(LAMBDA_APPLICATION_DOMAIN_NAME);
            expect(metric.metricData.applicationId).toEqual('applicationId');
            expect(metric.metricData.dataModelVersion).toEqual(DATA_MODEL_VERSION);
            expect(metric.metricData.type).toEqual('Metric');
            expect(metric.metricData.metricTimestamp).toBeDefined();
            expect(metric.metricData.applicationRuntime).toEqual('node');
        });
    });

    describe('afterInvocation', () => {
        const metric = Metric();
        metric.setPluginContext(pluginContext);
        metric.addCpuMetricReport = jest.fn(async () => null);
        metric.addMemoryMetricReport = jest.fn(async () => null);
        metric.addIoMetricReport = jest.fn(async () => null);
        metric.addThreadMetricReport = jest.fn(async () => null);
        metric.report = jest.fn();
        metric.reports = [1, 2, 3, 4];
        it('Should invoke add report functions', async () => {
            await metric.afterInvocation();
            expect(metric.addCpuMetricReport).toBeCalled();
            expect(metric.addMemoryMetricReport).toBeCalled();
            expect(metric.addIoMetricReport).toBeCalled();
            expect(metric.addThreadMetricReport).toBeCalled();
            expect(metric.report).toHaveBeenCalledTimes(4);

        });
    });

    describe('beforeInvocation + afterInvocation', () => {
        const metric = Metric();
        metric.setPluginContext(pluginContext);
        const beforeInvocationData = createMockBeforeInvocationData();

        it('Should set variables to their initial value', async () => {
            expect(metric.reports.length).toEqual(0);
            await metric.beforeInvocation(beforeInvocationData);
            await metric.afterInvocation();
            expect(metric.reports.length).toEqual(4);
            expect(metric.reporter.addReport).toHaveBeenCalledTimes(4);
        });
    });

    describe('addThreadMetricReport', () => {
        const metric = Metric();
        metric.setPluginContext(pluginContext);
        const beforeInvocationData = createMockBeforeInvocationData();

        it('Should set variables to their initial value', async () => {
            expect(metric.reports).toEqual([]);
            await metric.beforeInvocation(beforeInvocationData);
            await metric.addThreadMetricReport();
            const metricToGenerate = {
                'app.threadCount': 10
            };
            expect(metric.reports[0].data.id).toBeDefined();
            expect(metric.reports[0].data.metrics).toEqual(metricToGenerate);
        });
    });

    describe('addMemoryStatReport', () => {
        const metric = Metric();
        metric.setPluginContext(pluginContext);
        const beforeInvocationData = createMockBeforeInvocationData();

        it('Should set variables to their initial value', async () => {
            expect(metric.reports.length).toEqual(0);
            await metric.beforeInvocation(beforeInvocationData);
            await metric.addMemoryMetricReport();
            expect(metric.reports.length).toEqual(1);
            expect(metric.reports[0].type).toEqual('Metric');
            expect(metric.reports[0].apiKey).toEqual(metric.apiKey);
            expect(metric.reports[0].data.metricName).toEqual('MemoryMetric');
            expect(metric.reports[0].data.metrics['app.maxMemory']).toBeDefined();
            expect(metric.reports[0].data.metrics['app.rss']).toBeDefined();
            expect(metric.reports[0].data.metrics['app.rss']).toBeDefined();
            expect(metric.reports[0].data.metrics['app.usedMemory']).toBeDefined();
            expect(metric.reports[0].data.metrics['sys.external']).toBeDefined();
            expect(metric.reports[0].data.metrics['sys.freeMemory']).toBeDefined();
            expect(metric.reports[0].data.metrics['sys.maxMemory']).toBeDefined();
            expect(metric.reports[0].data.metrics['sys.usedMemory']).toBeDefined();
        });
    });

    describe('addCpuStatReport', () => {
        const metric = Metric();
        metric.setPluginContext(pluginContext);
        const beforeInvocationData = createMockBeforeInvocationData();

        it('Should set variables to their initial value', async () => {
            expect(metric.reports.length).toEqual(0);
            await metric.beforeInvocation(beforeInvocationData);
            await metric.addCpuMetricReport();
            expect(metric.reports.length).toEqual(1);
            expect(metric.reports[0].type).toEqual('Metric');
            expect(metric.reports[0].apiKey).toEqual(metric.apiKey);
            expect(metric.reports[0].data.metricName).toEqual('CPUMetric');
            expect(metric.reports[0].data.metrics['app.cpuLoad']).toBeDefined();
            expect(metric.reports[0].data.metrics['sys.cpuLoad']).toBeDefined();
        });
    });

    describe('addIoStatReport', () => {
        const metric = Metric();
        metric.setPluginContext(pluginContext);
        const beforeInvocationData = createMockBeforeInvocationData();

        it('Should set variables to their initial value', async () => {
            expect(metric.reports.length).toEqual(0);
            await metric.beforeInvocation(beforeInvocationData);
            await metric.addIoMetricReport();
            expect(metric.reports.length).toEqual(1);
            expect(metric.reports[0].type).toEqual('Metric');
            expect(metric.reports[0].apiKey).toEqual(metric.apiKey);
            expect(metric.reports[0].data.metricName).toEqual('IOMetric');

            expect(metric.reports[0].data.metrics['sys.diskReadBytes']).toBeDefined();
            expect(metric.reports[0].data.metrics['sys.diskWriteBytes']).toBeDefined();    
        });
    });
});