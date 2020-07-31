import ConfigProvider from '../../dist/config/ConfigProvider';
import ConfigNames from '../../dist/config/ConfigNames';
import LogPlugin from '../../dist/plugins/Log';
import { createMockPluginContext, createMockBeforeInvocationData } from '../mocks/mocks';
import {ApplicationManager} from '../../dist/application/ApplicationManager';
import {LambdaApplicationInfoProvider} from '../../dist/wrappers/lambda/LambdaApplicationInfoProvider';

ApplicationManager.setApplicationInfoProvider(new LambdaApplicationInfoProvider());

import TestUtils from '../utils';
import ExecutionContext from '../../dist/context/ExecutionContext';
import ExecutionContextManager from '../../dist/context/ExecutionContextManager';

beforeEach(() => {
    TestUtils.clearEnvironmentVariables();
    ConfigProvider.clear();
});

afterEach(() => {
    TestUtils.clearEnvironmentVariables();
    ConfigProvider.clear();
});

describe('console integration should filter logs with levels', () => {
    it('should capture console.log statements', () => {
        ConfigProvider.set(ConfigNames.THUNDRA_LOG_LOGLEVEL, 'WARN');

        const logPlugin = new LogPlugin();
        logPlugin.setPluginContext(createMockPluginContext());
        
        const mockExecContext = new ExecutionContext({});
        ExecutionContextManager.set(mockExecContext);

        logPlugin.beforeInvocation(mockExecContext);

        console.log('log');
        console.warn('warn');
        console.debug('debug');
        console.info('info');
        console.error('error');

        logPlugin.afterInvocation(mockExecContext);

        const { reports } = mockExecContext;

        expect(reports.length).toBe(2);
   
        expect(reports[0].data.logLevel).toBe('WARN');
        expect(reports[0].data.logMessage).toBe('warn');
        expect(reports[0].data.logContextName).toBe('STDOUT');

        expect(reports[1].data.logLevel).toBe('ERROR');
        expect(reports[1].data.logMessage).toBe('error');
        expect(reports[1].data.logContextName).toBe('STDERR');
    });
});
