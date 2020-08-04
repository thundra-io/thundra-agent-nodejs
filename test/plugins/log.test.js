import LogPlugin from '../../dist/plugins/Log';
import ExecutionContext from '../../dist/context/ExecutionContext';
import ExecutionContextManager from '../../dist/context/ExecutionContextManager';
import { createMockPluginContext } from '../mocks/mocks';
import {ApplicationManager} from '../../dist/application/ApplicationManager';
import {LambdaApplicationInfoProvider} from '../../dist/wrappers/lambda/LambdaApplicationInfoProvider';

ApplicationManager.setApplicationInfoProvider(new LambdaApplicationInfoProvider());

describe('log', () => {
    describe('constructor', () => {
        const options = { op2: 1, opt2: 2 };
        const logPlugin = new LogPlugin(options);

        it('should set variables', () => {
            expect(logPlugin.hooks).toEqual({ 'before-invocation': logPlugin.beforeInvocation, 'after-invocation': logPlugin.afterInvocation });
            expect(logPlugin.config).toEqual(options);
        });
    });

    describe('set plugin context', () => {
        it('should set pluginContext and apiKey', () => {
            const logPlugin = new LogPlugin();
            const pluginContext = createMockPluginContext();
            logPlugin.setPluginContext(pluginContext);

            expect(logPlugin.pluginContext).toBe(pluginContext);
        });
    });

    describe('before invocation', () => {
        it('should set reporter, contextId and originalContext', () => {
            const mockExecContext = new ExecutionContext({ 
                captureLog: false,
             });
            ExecutionContextManager.set(mockExecContext);

            const logPlugin = new LogPlugin();
            logPlugin.beforeInvocation(mockExecContext);

            expect(mockExecContext.captureLog).toBe(true);
        });
    });

    describe('report log', () => {
        it('should add log to logs list', () => {
            const logPlugin = new LogPlugin();
            const pluginContext = createMockPluginContext();

            const mockExecContext = new ExecutionContext();
            ExecutionContextManager.set(mockExecContext);
            
            const logData = {
                logMessage: 'logMessage',
                logLevel: 'TRACE',
                loggerName: 'loggerName',
                logTimestamp: Date.now(),
            };

            logPlugin.setPluginContext(pluginContext);
            logPlugin.beforeInvocation(mockExecContext);
            logPlugin.reportLog(logData, mockExecContext);

            expect(mockExecContext.logs.length).toBe(1);
        });
    });
});
