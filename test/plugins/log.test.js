import LogPlugin from '../../dist/plugins/Log';

import { createMockReporter, createMockPluginContext, createMockBeforeInvocationData} from '../mocks/mocks';
import {ApplicationManager} from '../../dist/application/ApplicationManager';
import {LambdaApplicationInfoProvider} from '../../dist/lambda/LambdaApplicationInfoProvider';

ApplicationManager.setApplicationInfoProvider(new LambdaApplicationInfoProvider());

describe('log', () => {
    describe('constructor', () => {
        const options = { op2: 1, opt2: 2 };
        const logPlugin = new LogPlugin(options);
        logPlugin.enable();

        it('should set variables', () => {
            expect(logPlugin.hooks).toEqual({ 'before-invocation': logPlugin.beforeInvocation, 'after-invocation': logPlugin.afterInvocation });
            expect(logPlugin.options).toEqual(options);
        });
    });

    describe('report', () => {
        describe('when reporter instance is set', () => {
            const logPlugin = new LogPlugin();
            logPlugin.enable();
            logPlugin.reporter = createMockReporter();
            logPlugin.report('logReport');
            it('should report', () => {
                expect(logPlugin.reporter.addReport).toBeCalledWith('logReport');
            });
        });
        describe('when reporter instance is not set', () => {
            const logPlugin = new LogPlugin();
            logPlugin.report('logReport');
        });
    });

    describe('set plugin context', () => {
        const logPlugin = new LogPlugin();
        logPlugin.enable();
        const pluginContext = createMockPluginContext();
        logPlugin.setPluginContext(pluginContext);
        it('should set pluginContext and apiKey', () => {
            expect(logPlugin.pluginContext).toBe(pluginContext);
            expect(logPlugin.apiKey).toBe(pluginContext.apiKey);
        });
    });

    describe('before invocation', () => {
        const logPlugin = new LogPlugin();
        logPlugin.enable();
        const beforeInvocationData = createMockBeforeInvocationData();
        const pluginContext = createMockPluginContext();
        logPlugin.setPluginContext(pluginContext);
        logPlugin.beforeInvocation(beforeInvocationData);
        it('should set reporter, contextId and originalContext', () => {
            expect(logPlugin.reporter).toBe(beforeInvocationData.reporter);
        });
    });

    describe('report log', () => {
        const logPlugin = new LogPlugin();
        logPlugin.enable();
        const pluginContext = createMockPluginContext();
        const beforeInvocationData = createMockBeforeInvocationData();
        const logData = {
            logMessage: 'logMessage',
            logLevel: 'TRACE',
            loggerName: 'loggerName',
            logTimestamp: Date.now(),
        };
        logPlugin.report = jest.fn();
        logPlugin.setPluginContext(pluginContext);
        logPlugin.beforeInvocation(beforeInvocationData);
        logPlugin.reportLog(logData);
        it('should add log to logs list', () => {
            expect(logPlugin.logs.length).toBe(1);
        });
    });
});
