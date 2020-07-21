import InvocationPlugin from '../plugins/Invocation';
import TracePlugin from '../plugins/Trace';
import LogPlugin from '../plugins/Log';
import PluginContext from '../plugins/PluginContext';
import Utils from '../plugins/utils/Utils';
import Reporter from '../Reporter';
import ConfigNames from '../config/ConfigNames';
import ThundraTracer from '../opentracing/Tracer';
import ConfigProvider from '../config/ConfigProvider';
import { ApplicationManager } from '../application/ApplicationManager';
import { ApplicationInfo } from '../application/ApplicationInfo';
import ExecutionContextManager from '../context/ExecutionContextManager';
import * as ExpressExecutor from './ExpressExecutor';
import * as asyncContextProvider from '../context/asyncContextProvider';
import ExecutionContext from '../context/ExecutionContext';

const get = require('lodash.get');

export function expressMW() {
    const applicationInfo = ApplicationManager.getApplicationInfo();
    const apiKey = ConfigProvider.thundraConfig.apiKey;
    const reporter = new Reporter(apiKey);
    const pluginContext = createPluginContext(applicationInfo, apiKey);
    const plugins = createPlugins(pluginContext);

    initContextManager();

    return (req: any, res: any, next: any) => ExecutionContextManager.runWithContext(
        createExecContext,
        () => {
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
        },
    );
}

function initContextManager() {
    ExecutionContextManager.setProvider(asyncContextProvider);
    ExecutionContextManager.init();
}

function createExecContext(): ExecutionContext {
    const { thundraConfig } = ConfigProvider;
    const tracerConfig = get(thundraConfig, 'traceConfig.tracerConfig', {});

    const tracer = new ThundraTracer(tracerConfig); // trace plugin
    const startTimestamp = Date.now();

    return new ExecutionContext({
        tracer,
        startTimestamp,
    });
}

function createPluginContext(applicationInfo: ApplicationInfo, apiKey: string): PluginContext {
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

    if (!ConfigProvider.get<boolean>(ConfigNames.THUNDRA_LOG_DISABLE) && thundraConfig.logConfig.enabled) {
        plugins.push(new LogPlugin(thundraConfig.logConfig));
    }

    const invocationPlugin = new InvocationPlugin(thundraConfig.invocationConfig);
    plugins.push(invocationPlugin);

    // Set plugin context for plugins
    plugins.forEach((plugin: any) => { plugin.setPluginContext(pluginContext); });

    return plugins;
}

function beforeRequest(plugins: any[]) {
    const context = ExecutionContextManager.get();
    for (const plugin of plugins) {
        plugin.beforeInvocation(context);
    }
}

async function afterRequest(plugins: any[], reporter: Reporter) {
    const context = ExecutionContextManager.get();
    context.finishTimestamp = Date.now();

    for (const plugin of plugins) {
        plugin.afterInvocation(context);
    }

    await reporter.sendReports(context.reports);
}
