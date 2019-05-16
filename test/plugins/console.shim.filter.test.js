import LogPlugin from '../../dist/plugins/Log';
import { createMockPluginContext, createMockBeforeInvocationData } from '../mocks/mocks';

describe('Console integration should filter logs with levels', () => {
    const logPlugin = new LogPlugin();
    const pluginContext = createMockPluginContext();
    const beforeInvocationData = createMockBeforeInvocationData();
    logPlugin.setPluginContext(pluginContext);
    logPlugin.beforeInvocation(beforeInvocationData);
    logPlugin.logs = [];

    process.env['thundra_agent_lambda_log_loglevel'] = 'WARN';
    
    console.log('log');
    console.warn('warn');
    console.debug('debug');        
    console.info('info');
    console.error('error');

    it('should capture console.log statements', () => {  
        expect(logPlugin.logs.length).toBe(2);
   
        expect(logPlugin.logs[0].logLevel).toBe('WARN');
        expect(logPlugin.logs[0].logMessage).toBe('warn');
        expect(logPlugin.logs[0].logContextName).toBe('STDOUT');

        expect(logPlugin.logs[1].logLevel).toBe('ERROR');
        expect(logPlugin.logs[1].logMessage).toBe('error');
        expect(logPlugin.logs[1].logContextName).toBe('STDERR');

    });       
});