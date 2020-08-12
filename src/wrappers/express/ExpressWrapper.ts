import Reporter from '../../Reporter';
import ConfigProvider from '../../config/ConfigProvider';
import { ApplicationManager } from '../../application/ApplicationManager';
import ExecutionContextManager from '../../context/ExecutionContextManager';
import * as ExpressExecutor from './ExpressExecutor';
import WrapperUtils from '../WebWrapperUtils';

export function expressMW(opts: any = {}) {
    ApplicationManager.setApplicationInfoProvider().update({
        applicationClassName: 'Express',
        applicationDomainName: 'API',
    });

    const config = opts.config || ConfigProvider.thundraConfig;
    const { apiKey } = config;
    const reporter = opts.reporter || new Reporter(apiKey);
    const pluginContext = opts.pluginContext || WrapperUtils.createPluginContext(apiKey, ExpressExecutor);
    const plugins = opts.plugins || WrapperUtils.createPlugins(config, pluginContext);

    if (!opts.disableAsyncContextManager) {
        WrapperUtils.initAsyncContextManager();
    }

    return (req: any, res: any, next: any) => ExecutionContextManager.runWithContext(
        WrapperUtils.createExecContext,
        () => {
            try {
                WrapperUtils.beforeRequest(req, plugins);
                res.once('finish', () => {
                    WrapperUtils.afterRequest(res, plugins, reporter);
                });
            } catch (err) {
                console.error(err);
            } finally {
                next();
            }
        },
    );
}
