import LogPlugin from '../../dist/plugins/Log';
import { createMockPluginContext, createMockBeforeInvocationData } from '../mocks/mocks';
import {ApplicationManager} from '../../dist/application/ApplicationManager';
import {LambdaApplicationInfoProvider} from '../../dist/wrappers/lambda/LambdaApplicationInfoProvider';
import ExecutionContext from '../../dist/context/ExecutionContext';
import ExecutionContextManager from '../../dist/context/ExecutionContextManager';

ApplicationManager.setApplicationInfoProvider(new LambdaApplicationInfoProvider());

describe('log plugin shim console', () => {
    it('should capture console.log statements', () => {  
        const logPlugin = new LogPlugin();
    
        logPlugin.setPluginContext(createMockPluginContext());
    
        const mockExecContext = new ExecutionContext({});
        ExecutionContextManager.set(mockExecContext);
    
        logPlugin.beforeInvocation(mockExecContext);
    
        console.log('log');
        console.debug('debug');        
        console.info('info');
        console.warn('warn');
        console.error('error');
    
        logPlugin.afterInvocation(mockExecContext);
    
        const { reports } = mockExecContext;

        expect(reports.length).toBe(5);

        expect(reports[0].data.logLevel).toBe('INFO');
        expect(reports[0].data.logMessage).toBe('log');
        expect(reports[0].data.logContextName).toBe('STDOUT');
        expect(reports[1].data.logLevel).toBe('DEBUG');
        expect(reports[1].data.logMessage).toBe('debug');
        expect(reports[1].data.logContextName).toBe('STDOUT');
        expect(reports[2].data.logLevel).toBe('INFO');
        expect(reports[2].data.logMessage).toBe('info');
        expect(reports[2].data.logContextName).toBe('STDOUT');
        expect(reports[3].data.logLevel).toBe('WARN');
        expect(reports[3].data.logMessage).toBe('warn');
        expect(reports[3].data.logContextName).toBe('STDOUT');
        expect(reports[4].data.logLevel).toBe('ERROR');
        expect(reports[4].data.logMessage).toBe('error');
        expect(reports[4].data.logContextName).toBe('STDERR');
    });       
});

describe('log plugin unshim console', () => {
    it('should not capture console.log statements after Invocation', () => {
        const logPlugin = new LogPlugin();
    
        logPlugin.setPluginContext(createMockPluginContext());
    
        const mockExecContext = new ExecutionContext({});
        ExecutionContextManager.set(mockExecContext);
    
        logPlugin.beforeInvocation(mockExecContext);
        logPlugin.afterInvocation(mockExecContext);
        
        console.log('log');
        const { reports } = mockExecContext;

        expect(reports.length).toBe(0);
    });       
});
