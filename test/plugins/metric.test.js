import Metric from '../../dist/plugins/Metric';
import Utils from '../../dist/utils/Utils';
import ExecutionContext from '../../dist/context/ExecutionContext';
import ExecutionContextManager from '../../dist/context/ExecutionContextManager';
import { ApplicationManager } from '../../dist/application/ApplicationManager';

import { createMockPluginContext } from '../mocks/mocks';

ApplicationManager.setApplicationInfoProvider(null);

Utils.readProcIoPromise = jest.fn(() => {
    return new Promise((resolve, reject) => {
        return resolve({ readBytes: 1024, writeBytes: 4096 });
    });
});

Utils.readProcMetricPromise = jest.fn(() => {
    return new Promise((resolve, reject) => {
        return resolve({ threadCount: 10 });
    });
});

const pluginContext = createMockPluginContext();

describe('metrics', () => {
    describe('export function', () => {
        const config = { opt1: 'opt1', opt2: 'opt2' };
        const metric = new Metric(config);
        metric.setPluginContext(pluginContext);
        it('should be able to pass options', () => {
            expect(metric.config).toEqual(config);
        });
    });

    describe('constructor', () => {
        const config = { op1t: 'opt1', opt2: 'opt2' };
        const metric = new Metric();
        const metricWithOptions = new Metric(config);

        it('should have the same hooks', () => {
            expect(metric.hooks).toEqual({
                'before-invocation': metric.beforeInvocation,
                'after-invocation': metric.afterInvocation
            });
        });
        it('should be able to initialize variables without options', () => {
            expect(metric.options).toEqual(undefined);
        });
        it('should be able to initialize variables with options', () => {
            expect(metricWithOptions.config).toEqual(config);

        });
        it('should get clock tick', () => {
            expect(metric.clockTick).toBeTruthy();
            expect(metricWithOptions.clockTick).toBeTruthy();
        });

    });

    describe('set plugin context', () => {
        const metric = new Metric();
        metric.setPluginContext(pluginContext);
        it('should set api key and plugin context', () => {
            expect(metric.pluginContext).toEqual(pluginContext);
        });
    });

    describe('before invocation', () => {
        const metric = new Metric();
        metric.setPluginContext(pluginContext);

        it('Should set variables to their initial value', async () => {
            const mockExecContext = new ExecutionContext();
            ExecutionContextManager.set(mockExecContext);

            await metric.beforeInvocation(mockExecContext);

            const { metrics } = mockExecContext;

            expect(Utils.readProcIoPromise).toBeCalled();
            expect(Utils.readProcMetricPromise).toBeCalled();
            expect(metrics.initialProcMetric).toEqual({ threadCount: 10 });
            expect(metrics.initialProcIo).toEqual({ readBytes: 1024, writeBytes: 4096 });
            expect(metrics.startCpuUsage).toBeDefined();
        });
    });

    describe('after invocation', () => {
        const metric = new Metric();
        metric.setPluginContext(pluginContext);
        metric.addCpuMetricReport = jest.fn(async () => null);
        metric.addMemoryMetricReport = jest.fn(async () => null);
        metric.addIoMetricReport = jest.fn(async () => null);
        metric.addThreadMetricReport = jest.fn(async () => null);

        it('should call internal metric methods', async () => {
            const mockExecContext = new ExecutionContext();
            ExecutionContextManager.set(mockExecContext);

            await metric.beforeInvocation(mockExecContext);
            await metric.afterInvocation(mockExecContext);

            expect(metric.addCpuMetricReport).toBeCalled();
            expect(metric.addMemoryMetricReport).toBeCalled();
            expect(metric.addIoMetricReport).toBeCalled();
            expect(metric.addThreadMetricReport).toBeCalled();
        });
    });

    describe('before invocation + after invocation', () => {
        const metric = new Metric();
        metric.setPluginContext(pluginContext);

        it('should call internal metric methods', async () => {
            const mockExecContext = new ExecutionContext();
            ExecutionContextManager.set(mockExecContext);
            
            await metric.beforeInvocation(mockExecContext);
            await metric.afterInvocation(mockExecContext);
            
            const { reports } = mockExecContext;
            expect(reports.length).toEqual(4);
        });
    });

    describe('add thread metric report', () => {
        const metric = new Metric();
        metric.setPluginContext(pluginContext);

        it('Should set variables to their initial value', async () => {
            const mockExecContext = new ExecutionContext();
            ExecutionContextManager.set(mockExecContext);
            
            await metric.beforeInvocation(mockExecContext);
            await metric.addThreadMetricReport(mockExecContext, '');
            const metricToGenerate = {
                'app.threadCount': 10
            };

            const { reports } = mockExecContext;

            expect(reports[0].data.id).toBeDefined();
            expect(reports[0].data.metrics).toEqual(metricToGenerate);
        });
    });

    describe('add memory metric report', () => {
        const metric = new Metric();
        metric.setPluginContext(pluginContext);

        it('Should set variables to their initial value', async () => {
            const mockExecContext = new ExecutionContext();
            ExecutionContextManager.set(mockExecContext);
            
            await metric.beforeInvocation(mockExecContext);
            await metric.addMemoryMetricReport(mockExecContext, '');
            
            const { reports } = mockExecContext;

            expect(reports.length).toEqual(1);
            expect(reports[0].type).toEqual('Metric');
            expect(reports[0].data.metricName).toEqual('MemoryMetric');
            expect(reports[0].data.metrics['app.maxMemory']).toBeDefined();
            expect(reports[0].data.metrics['app.rss']).toBeDefined();
            expect(reports[0].data.metrics['app.rss']).toBeDefined();
            expect(reports[0].data.metrics['app.usedMemory']).toBeDefined();
            expect(reports[0].data.metrics['sys.external']).toBeDefined();
            expect(reports[0].data.metrics['sys.freeMemory']).toBeDefined();
            expect(reports[0].data.metrics['sys.maxMemory']).toBeDefined();
            expect(reports[0].data.metrics['sys.usedMemory']).toBeDefined();
        });
    });

    describe('add cpu metric report', () => {
        const metric = new Metric();
        metric.setPluginContext(pluginContext);

        it('Should set variables to their initial value', async () => {
            const mockExecContext = new ExecutionContext();
            ExecutionContextManager.set(mockExecContext);
            
            await metric.beforeInvocation(mockExecContext);
            await metric.addCpuMetricReport(mockExecContext, '');

            const { reports } = mockExecContext;

            expect(reports.length).toEqual(1);
            expect(reports[0].type).toEqual('Metric');
            expect(reports[0].data.metricName).toEqual('CPUMetric');
            expect(reports[0].data.metrics['app.cpuLoad']).toBeDefined();
            expect(reports[0].data.metrics['sys.cpuLoad']).toBeDefined();
        });
    });

    describe('add io metric report', () => {
        const metric = new Metric();
        metric.setPluginContext(pluginContext);

        it('should set variables to their initial value', async () => {
            const mockExecContext = new ExecutionContext();
            ExecutionContextManager.set(mockExecContext);
            
            await metric.beforeInvocation(mockExecContext);

            await metric.addIoMetricReport(mockExecContext, '');

            const { reports } = mockExecContext;

            expect(reports.length).toEqual(1);
            expect(reports[0].type).toEqual('Metric');
            expect(reports[0].data.metricName).toEqual('IOMetric');
            expect(reports[0].data.metrics['sys.diskReadBytes']).toBeDefined();
            expect(reports[0].data.metrics['sys.diskWriteBytes']).toBeDefined();
        });
    });
});
