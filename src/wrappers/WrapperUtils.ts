import InvocationPlugin from '../plugins/Invocation';
import TracePlugin from '../plugins/Trace';
import LogPlugin from '../plugins/Log';
import ExecutionContextManager from '../context/ExecutionContextManager';
import Reporter from '../Reporter';
import ThundraLogger from '../ThundraLogger';
import PluginContext from '../plugins/PluginContext';
import ConfigProvider from '../config/ConfigProvider';
import ThundraConfig from '../plugins/config/ThundraConfig';
import ConfigNames from '../config/ConfigNames';
import { ApplicationManager } from '../application/ApplicationManager';
import ExecutionContext from '../context/ExecutionContext';
import Utils from '../utils/Utils';
import ThundraTracer from '../opentracing/Tracer';
import * as asyncContextProvider from '../context/asyncContextProvider';

const get = require('lodash.get');

export default class WrapperUtils {
    static beforeRequest(request: any, plugins: any[]) {
        const context = ExecutionContextManager.get();

        // Put current request into the execution context
        context.request = request;

        for (const plugin of plugins) {
            plugin.beforeInvocation(context);
        }
    }

    static async afterRequest(response: any, plugins: any[], reporter: Reporter) {
        const context = ExecutionContextManager.get();

        context.finishTimestamp = Date.now();
        context.response = response;

        for (const plugin of plugins) {
            plugin.afterInvocation(context);
        }

        try {
            await reporter.sendReports(context.reports);
        } catch (err) {
            ThundraLogger.error(err);
        }
    }

    static createPlugins(config: ThundraConfig, pluginContext: PluginContext): any[] {
        const plugins: any[] = [];
        if (config.disableMonitoring) {
            return plugins;
        }

        if (!ConfigProvider.get<boolean>(ConfigNames.THUNDRA_TRACE_DISABLE) && config.traceConfig.enabled) {
            const tracePlugin = new TracePlugin(config.traceConfig);
            plugins.push(tracePlugin);
        }

        if (!ConfigProvider.get<boolean>(ConfigNames.THUNDRA_LOG_DISABLE) && config.logConfig.enabled) {
            plugins.push(new LogPlugin(config.logConfig));
        }

        const invocationPlugin = new InvocationPlugin(config.invocationConfig);
        plugins.push(invocationPlugin);

        // Set plugin context for plugins
        plugins.forEach((plugin: any) => { plugin.setPluginContext(pluginContext); });

        return plugins;
    }

    static createPluginContext(apiKey: string, executor: any): PluginContext {
        const applicationInfo = ApplicationManager.getApplicationInfo();

        return new PluginContext({
            applicationInfo,
            apiKey,
            executor,
        });
    }

    static initAsyncContextManager() {
        ExecutionContextManager.setProvider(asyncContextProvider);
        ExecutionContextManager.init();
    }

    static createExecContext(): ExecutionContext {
        const { thundraConfig } = ConfigProvider;
        const tracerConfig = get(thundraConfig, 'traceConfig.tracerConfig', {});

        const tracer = new ThundraTracer(tracerConfig);
        const transactionId = Utils.generateId();

        tracer.setTransactionId(transactionId);

        const startTimestamp = Date.now();

        return new ExecutionContext({
            tracer,
            transactionId,
            startTimestamp,
        });
    }
}
