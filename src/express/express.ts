import InvocationPlugin from '../plugins/Invocation';
import LogPlugin from '../plugins/Log';
import PluginContext from '../plugins/PluginContext';
import Utils from '../plugins/utils/Utils';
import Reporter from '../Reporter';
import { ApplicationManager } from '../application/ApplicationManager';
import { ApplicationInfo } from '../application/ApplicationInfo';

const apiKey = '3e9be473-38ba-4d3c-b59f-9a7ce43e412d';

export function expressMW() {
    const applicationInfo = ApplicationManager.getApplicationInfo();

    return async (req: any, res: any, next: any) => {
        try {
            const pluginContext = createPluginContext(applicationInfo);
            const plugins = createPlugins(pluginContext);
            const reporter = new Reporter(apiKey);

            beforeRequest(plugins, reporter);

            res.once('finish', async () => {
                afterRequest(plugins);
                await reporter.sendReports();
            });
        } catch (err) {
            console.error(err);
        } finally {
            next();
        }
    };
}

function createPluginContext(applicationInfo: ApplicationInfo): PluginContext {
    return new PluginContext({
        ...applicationInfo,
        transactionId: Utils.generateId(),
    });
}

function createPlugins(pluginContext: PluginContext): any[] {
    const plugins: any[] = [];

    plugins.push(new InvocationPlugin());
    plugins.push(new LogPlugin());

    plugins.forEach((plugin: any) => { plugin.setPluginContext(pluginContext); });

    return plugins;
}

function beforeRequest(plugins: any[], reporter: Reporter) {
    for (const plugin of plugins) {
        plugin.beforeInvocation({ reporter });
    }
}

function afterRequest(plugins: any[]) {
    for (const plugin of plugins) {
        plugin.afterInvocation();
    }
}
