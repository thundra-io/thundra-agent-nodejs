import Reporter from '../../Reporter';
import ConfigProvider from '../../config/ConfigProvider';
import { ApplicationManager } from '../../application/ApplicationManager';
import ExecutionContextManager from '../../context/ExecutionContextManager';
import * as ExpressExecutor from './ExpressExecutor';
import WrapperUtils from '../WrapperUtils';

const get = require('lodash.get');

export function expressMW() {
    ApplicationManager.setApplicationInfoProvider().update({
        applicationName: 'express-test-app',
        applicationClassName: 'Express',
        applicationDomainName: 'API',
    });

    const config = ConfigProvider.thundraConfig;
    const { apiKey } = config;
    const reporter = new Reporter(apiKey);
    const pluginContext = WrapperUtils.createPluginContext(apiKey, ExpressExecutor);
    const plugins = WrapperUtils.createPlugins(config, pluginContext);

    WrapperUtils.initAsyncContextManager();

    return (req: any, res: any, next: any) => ExecutionContextManager.runWithContext(
        WrapperUtils.createExecContext,
        () => {
            try {
                WrapperUtils.beforeRequest(plugins);
                res.once('finish', () => {
                    WrapperUtils.afterRequest(plugins, reporter);
                });
            } catch (err) {
                console.error(err);
            } finally {
                next();
            }
        },
    );
}
