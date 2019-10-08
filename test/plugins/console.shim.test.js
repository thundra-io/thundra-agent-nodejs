import LogPlugin from '../../dist/plugins/Log';
import { createMockPluginContext, createMockBeforeInvocationData } from '../mocks/mocks';

describe('Log plugin shim console', () => {
    const logPlugin = new LogPlugin();
    logPlugin.enable();
    
    const pluginContext = createMockPluginContext();
    const beforeInvocationData = createMockBeforeInvocationData();
    logPlugin.setPluginContext(pluginContext);
    logPlugin.beforeInvocation(beforeInvocationData);
    logPlugin.logs = [];
    console.log('log');
    console.debug('debug');        
    console.info('info');
    console.warn('warn');
    console.error('error');

    it('should capture console.log statements', () => {  
        expect(logPlugin.logs.length).toBe(5);

        expect(logPlugin.logs[0].logLevel).toBe('INFO');
        expect(logPlugin.logs[0].logMessage).toBe('log');
        expect(logPlugin.logs[0].logContextName).toBe('STDOUT');

        expect(logPlugin.logs[1].logLevel).toBe('DEBUG');
        expect(logPlugin.logs[1].logMessage).toBe('debug');
        expect(logPlugin.logs[1].logContextName).toBe('STDOUT');

        expect(logPlugin.logs[2].logLevel).toBe('INFO');
        expect(logPlugin.logs[2].logMessage).toBe('info');
        expect(logPlugin.logs[2].logContextName).toBe('STDOUT');

        expect(logPlugin.logs[3].logLevel).toBe('WARN');
        expect(logPlugin.logs[3].logMessage).toBe('warn');
        expect(logPlugin.logs[3].logContextName).toBe('STDOUT');

        expect(logPlugin.logs[4].logLevel).toBe('ERROR');
        expect(logPlugin.logs[4].logMessage).toBe('error');
        expect(logPlugin.logs[4].logContextName).toBe('STDERR');
    });       
});

describe('Log plugin unshim console', () => {
    const logPlugin = new LogPlugin();
    const pluginContext = createMockPluginContext();
    const beforeInvocationData = createMockBeforeInvocationData();
    logPlugin.setPluginContext(pluginContext);
    logPlugin.beforeInvocation(beforeInvocationData);
    logPlugin.unShimConsole();

    it('should not capture console.log statements after unshim', () => {  
        console.log('log');
        expect(logPlugin.logs.length).toBe(0);
    });       
});
