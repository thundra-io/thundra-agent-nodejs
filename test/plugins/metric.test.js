import Metric from '../../dist/plugins/Metric';
import {createMockPluginContext, createMockBeforeInvocationData} from '../mocks/mocks';
import {DATA_FORMAT_VERSION} from '../../dist/Constants';

import Utils from '../../dist/plugins/Utils';

Utils.readProcIoPromise = jest.fn(() => {
    return new Promise((resolve, reject) => {
        return resolve({readBytes: 1024, writeBytes: 4096});
    });
});

Utils.readProcStatPromise = jest.fn(() => {
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
            expect(metric.statData).toEqual({'applicationType': 'node'});
            expect(metric.reports).toEqual([]);
            expect(metric.options).toEqual(undefined);
        });
        it('Should be able to initialize variables with options', () => {
            expect(metricWithOptions.statData).toEqual({'applicationType': 'node'});
            expect(metricWithOptions.reports).toEqual([]);
            expect(metricWithOptions.options).toEqual(options);

        });
        it('Should set dataType correctly',()=> {
            expect(metric.dataType).toEqual('StatData');
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
            expect(Utils.readProcStatPromise).toBeCalled();
            expect(metric.initialProcStat).toEqual({threadCount: 10});
            expect(metric.initialProcIo).toEqual({readBytes: 1024, writeBytes: 4096});
            expect(metric.reporter).toBe(beforeInvocationData.reporter);
            expect(metric.apiKey).toBe(pluginContext.apiKey);
            expect(metric.reports).toEqual([]);
            expect(metric.startCpuUsage).toBeDefined();
            expect(metric.statData.statTimestamp).toBeDefined();
            expect(metric.statData).toEqual({
                applicationId: pluginContext.applicationId,
                transactionId: beforeInvocationData.transactionId,
                rootExecutionAuditContextId: beforeInvocationData.contextId,
                applicationName: 'test',
                applicationProfile: pluginContext.applicationProfile,
                applicationVersion: pluginContext.applicationVersion,
                applicationType: 'node',
                functionRegion: pluginContext.applicationRegion,
                statTimestamp: metric.statData.statTimestamp
            });

        });

    });

    describe('afterInvocation', () => {
        const metric = Metric();
        metric.setPluginContext(pluginContext);
        metric.addCpuStatReport = jest.fn(async () => null);
        metric.addMemoryStatReport = jest.fn(async () => null);
        metric.addIoStatReport = jest.fn(async () => null);
        metric.addThreadStatReport = jest.fn(async () => null);
        metric.report = jest.fn();
        metric.reports = [1, 2, 3, 4];
        it('Should invoke add report functions', async () => {
            await metric.afterInvocation();
            expect(metric.addCpuStatReport).toBeCalled();
            expect(metric.addMemoryStatReport).toBeCalled();
            expect(metric.addIoStatReport).toBeCalled();
            expect(metric.addThreadStatReport).toBeCalled();
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

    describe('addThreadStatReport', () => {
        const metric = Metric();
        metric.setPluginContext(pluginContext);
        const beforeInvocationData = createMockBeforeInvocationData();

        it('Should set variables to their initial value', async () => {
            expect(metric.reports).toEqual([]);
            await metric.beforeInvocation(beforeInvocationData);
            await metric.addThreadStatReport();
            const reportToGenerate = {
                data: {
                    ...metric.statData,
                    id: metric.reports[0].data.id,
                    statName: 'ThreadStat',
                    threadCount: metric.initialProcStat.threadCount
                },
                type: 'StatData',
                apiKey: metric.apiKey,
                dataFormatVersion: DATA_FORMAT_VERSION
            };
            expect(metric.reports[0].data.id).toBeDefined();
            expect(metric.reports).toEqual([reportToGenerate]);

        });
    });

    describe('addMemoryStatReport', () => {
        const metric = Metric();
        metric.setPluginContext(pluginContext);
        const beforeInvocationData = createMockBeforeInvocationData();

        it('Should set variables to their initial value', async () => {
            expect(metric.reports.length).toEqual(0);
            await metric.beforeInvocation(beforeInvocationData);
            await metric.addMemoryStatReport();
            expect(metric.reports.length).toEqual(1);
            expect(metric.reports[0].type).toEqual('StatData');
            expect(metric.reports[0].apiKey).toEqual(metric.apiKey);
            expect(metric.reports[0].data.statName).toEqual('MemoryStat');
            expect(metric.reports[0].data['proc.rss']).toBeDefined();
            expect(metric.reports[0].data['proc.heapUsed']).toBeDefined();
            expect(metric.reports[0].data['proc.heapTotal']).toBeDefined();
            expect(metric.reports[0].data['proc.external']).toBeDefined();
            expect(metric.reports[0].data['os.totalMemory']).toBeDefined();
            expect(metric.reports[0].data['os.freeMemory']).toBeDefined();
            expect(metric.reports[0].data['os.usedMemory']).toBeDefined();
        });
    });

    describe('addCpuStatReport', () => {
        const metric = Metric();
        metric.setPluginContext(pluginContext);
        const beforeInvocationData = createMockBeforeInvocationData();

        it('Should set variables to their initial value', async () => {
            expect(metric.reports.length).toEqual(0);
            await metric.beforeInvocation(beforeInvocationData);
            await metric.addCpuStatReport();
            expect(metric.reports.length).toEqual(1);
            expect(metric.reports[0].type).toEqual('StatData');
            expect(metric.reports[0].apiKey).toEqual(metric.apiKey);
            expect(metric.reports[0].data.statName).toEqual('CpuStat');
            expect(metric.reports[0].data['processCpuLoad']).toBeDefined();
            expect(metric.reports[0].data['systemCpuLoad']).toBeDefined();
        });
    });

    describe('addIoStatReport', () => {
        const metric = Metric();
        metric.setPluginContext(pluginContext);
        const beforeInvocationData = createMockBeforeInvocationData();

        it('Should set variables to their initial value', async () => {
            expect(metric.reports.length).toEqual(0);
            await metric.beforeInvocation(beforeInvocationData);
            await metric.addIoStatReport();
            expect(metric.reports.length).toEqual(1);
            expect(metric.reports[0].type).toEqual('StatData');
            expect(metric.reports[0].apiKey).toEqual(metric.apiKey);
            expect(metric.reports[0].data.statName).toEqual('IoStat');
            expect(metric.reports[0].data['proc.diskReadBytes']).toBeDefined();
            expect(metric.reports[0].data['proc.diskWriteBytes']).toBeDefined();
        });
    });

});