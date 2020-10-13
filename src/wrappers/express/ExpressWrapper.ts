import Reporter from '../../Reporter';
import ConfigProvider from '../../config/ConfigProvider';
import { ApplicationManager } from '../../application/ApplicationManager';
import ExecutionContextManager from '../../context/ExecutionContextManager';
import * as ExpressExecutor from './ExpressExecutor';
import WrapperUtils from '../WebWrapperUtils';
import ExecutionContext from '../../context/ExecutionContext';
import ThundraLogger from '../../ThundraLogger';
import { ClassNames, DomainNames } from '../../Constants';

export function expressMW(opts: any = {}) {
    ApplicationManager.setApplicationInfoProvider().update({
        applicationClassName: ClassNames.EXPRESS,
        applicationDomainName: DomainNames.API,
    });

    const appInfo = ApplicationManager.getApplicationInfo();
    ApplicationManager.getApplicationInfoProvider().update({
        applicationId: WrapperUtils.getDefaultApplicationId(appInfo),
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
        async function () {
            const context: ExecutionContext = this;
            try {
                await WrapperUtils.beforeRequest(req, res, plugins);
                res.once('finish', () => {
                    ExecutionContextManager.set(context);
                    WrapperUtils.afterRequest(req, res, plugins, reporter);
                });
            } catch (err) {
                ThundraLogger.error('<ExpressWrapper> Error occured in ExpressWrapper:', err);
            } finally {
                next();
            }
        },
    );
}
