import LogPlugin from '../../dist/plugins/Log';
import { createMockPluginContext, createMockBeforeInvocationData } from '../mocks/mocks';

describe('Console integration should filter logs with levels', () => {
    const logPlugin = new LogPlugin();
    const pluginContext = createMockPluginContext();
    const beforeInvocationData = createMockBeforeInvocationData();

    const logs = [];
    logPlugin.report = (logReport) => {
        logs.push(logReport);
    };

    logPlugin.setPluginContext(pluginContext);
    logPlugin.beforeInvocation(beforeInvocationData);

    process.env['thundra_agent_lambda_log_loglevel'] = 'WARN';
    
    console.log('log');
    console.warn('warn');
    console.debug('debug');        
    console.info('info');
    console.error('error');

    logPlugin.afterInvocation();

    it('should capture console.log statements', () => {  
        expect(logs.length).toBe(2);
   
        expect(logs[0].data.logLevel).toBe('WARN');
        expect(logs[0].data.logMessage).toBe('warn');
        expect(logs[0].data.logContextName).toBe('STDOUT');

        expect(logs[1].data.logLevel).toBe('ERROR');
        expect(logs[1].data.logMessage).toBe('error');
        expect(logs[1].data.logContextName).toBe('STDERR');

    });       
});