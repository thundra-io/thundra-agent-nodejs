import InvocationPlugin from '../plugins/Invocation';
import LogPlugin from '../plugins/Log';
import PluginContext from '../plugins/PluginContext';
import Utils from '../plugins/utils/Utils';
import Reporter from '../Reporter';
import { ApplicationManager } from '../application/ApplicationManager';
import { ApplicationInfo } from '../application/ApplicationInfo';
import ConfigProvider from '../config/ConfigProvider';

export function expressMW() {
    const applicationInfo = ApplicationManager.getApplicationInfo();

    const apiKey = ConfigProvider.thundraConfig.apiKey;
    const reporter = new Reporter(apiKey);

    const pluginContext = createPluginContext(applicationInfo, reporter, apiKey);
    const plugins = createPlugins(pluginContext);

    return async (req: any, res: any, next: any) => {
        try {
            beforeRequest(plugins, pluginContext);

            res.once('finish', async () => {
                afterRequest(plugins, pluginContext);
                // await reporter.sendReports();
            });
        } catch (err) {
            console.error(err);
        } finally {
            next();
        }
    };
}

function createPluginContext(applicationInfo: ApplicationInfo, reporter: Reporter, apiKey: string): PluginContext {
    return new PluginContext({
        ...applicationInfo,
        transactionId: Utils.generateId(),
        reporter,
        apiKey,
    });
}

function createPlugins(pluginContext: PluginContext): any[] {
    const plugins: any[] = [];

    plugins.push(new InvocationPlugin());
    plugins.push(new LogPlugin());

    plugins.forEach((plugin: any) => { plugin.setPluginContext(pluginContext); });

    return plugins;
}

function beforeRequest(plugins: any[], pluginContext: PluginContext) {
    for (const plugin of plugins) {
        plugin.beforeInvocation({ pluginContext });
    }
}

function afterRequest(plugins: any[], pluginContext: PluginContext) {
    for (const plugin of plugins) {
        plugin.afterInvocation({ pluginContext });
    }
}
