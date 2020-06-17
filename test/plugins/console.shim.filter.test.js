import ConfigProvider from '../../dist/config/ConfigProvider';
import ConfigNames from '../../dist/config/ConfigNames';
import LogPlugin from '../../dist/plugins/Log';
import { createMockPluginContext, createMockBeforeInvocationData } from '../mocks/mocks';
import {ApplicationManager} from '../../dist/application/ApplicationManager';
import {LambdaApplicationInfoProvider} from '../../dist/lambda/LambdaApplicationInfoProvider';

ApplicationManager.setApplicationInfoProvider(new LambdaApplicationInfoProvider());

import TestUtils from '../utils';

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
        logPlugin.enable();

        const pluginContext = createMockPluginContext();
        const beforeInvocationData = createMockBeforeInvocationData();

        const logs = [];
        logPlugin.report = (logReport) => {
            logs.push(logReport);
        };

        logPlugin.setPluginContext(pluginContext);
        logPlugin.beforeInvocation(beforeInvocationData);

        console.log('log');
        console.warn('warn');
        console.debug('debug');
        console.info('info');
        console.error('error');

        logPlugin.afterInvocation();

        expect(logs.length).toBe(2);
   
        expect(logs[0].data.logLevel).toBe('WARN');
        expect(logs[0].data.logMessage).toBe('warn');
        expect(logs[0].data.logContextName).toBe('STDOUT');

        expect(logs[1].data.logLevel).toBe('ERROR');
        expect(logs[1].data.logMessage).toBe('error');
        expect(logs[1].data.logContextName).toBe('STDERR');
    });
});
