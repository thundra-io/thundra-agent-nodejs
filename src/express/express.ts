import InvocationPlugin from '../plugins/Invocation';
import TracePlugin from '../plugins/Trace';
import PluginContext from '../plugins/PluginContext';
import Utils from '../plugins/utils/Utils';
import Reporter from '../Reporter';
import { ApplicationManager } from '../application/ApplicationManager';
import { ApplicationInfo } from '../application/ApplicationInfo';
import ConfigProvider from '../config/ConfigProvider';
import execContext from '../execContext';
import ThundraTracer from '../opentracing/Tracer';
import * as ExpressExecutor from './ExpressExecutor';
import ConfigNames from '../config/ConfigNames';

const get = require('lodash.get');

export function expressMW() {
    const applicationInfo = ApplicationManager.getApplicationInfo();

    const apiKey = ConfigProvider.thundraConfig.apiKey;
    const reporter = new Reporter(apiKey);
    const pluginContext = createPluginContext(applicationInfo, reporter, apiKey);
    const plugins = createPlugins(pluginContext);

    return (req: any, res: any, next: any) => {
        try {
            beforeRequest(plugins);

            res.once('finish', async () => {
                await afterRequest(plugins, reporter);
            });
        } catch (err) {
            console.error(err);
        } finally {
            next();
        }
    };
}

function initializeExecContext(): any {
    for (const key in execContext) {
        delete execContext[key];
    }

    const { thundraConfig } = ConfigProvider;
    const tracerConfig = get(thundraConfig, 'traceConfig.tracerConfig', {});

    execContext.tracer = new ThundraTracer(tracerConfig); // trace plugin
    execContext.startTimestamp = Date.now();
}

function createPluginContext(applicationInfo: ApplicationInfo, reporter: Reporter, apiKey: string): PluginContext {
    return new PluginContext({
        ...applicationInfo,
        transactionId: Utils.generateId(),
        apiKey,
        executor: ExpressExecutor,
    });
}

function createPlugins(pluginContext: PluginContext): any[] {
    const { thundraConfig } = ConfigProvider;

    const plugins: any[] = [];
    if (thundraConfig.disableMonitoring) {
        return plugins;
    }

    if (!ConfigProvider.get<boolean>(ConfigNames.THUNDRA_TRACE_DISABLE) && thundraConfig.traceConfig.enabled) {
        const tracePlugin = new TracePlugin(thundraConfig.traceConfig);
        plugins.push(tracePlugin);
    }

    const invocationPlugin = new InvocationPlugin(thundraConfig.invocationConfig);
    plugins.push(invocationPlugin);

    // Set plugin context for plugins
    plugins.forEach((plugin: any) => { plugin.setPluginContext(pluginContext); });

    return plugins;
}

function beforeRequest(plugins: any[]) {
    initializeExecContext();

    for (const plugin of plugins) {
        plugin.beforeInvocation(execContext);
    }
}

async function afterRequest(plugins: any[], reporter: Reporter) {
    execContext.finishTimestamp = Date.now();

    for (const plugin of plugins) {
        plugin.afterInvocation(execContext);
    }

    const { reports } = execContext;
    await reporter.sendReports(reports);
}
