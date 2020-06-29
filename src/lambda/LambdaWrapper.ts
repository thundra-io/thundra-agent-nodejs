import ThundraWrapper from '../ThundraWrapper';
import TracePlugin from '../plugins/Trace';
import MetricPlugin from '../plugins/Metric';
import InvocationPlugin from '../plugins/Invocation';
import ConfigProvider from '../config/ConfigProvider';
import Utils from '../plugins/utils/Utils';
import PluginContext from '../plugins/PluginContext';
import { EnvVariableKeys } from '../Constants';
import Logger from '../plugins/Logger';
import Log from '../plugins/Log';
import InvocationTraceSupport from '../plugins/support/InvocationTraceSupport';
import ConfigNames from '../config/ConfigNames';
import { ApplicationManager } from '../application/ApplicationManager';
import { LambdaContextProvider } from '../lambda/LambdaContextProvider';
import { LambdaApplicationInfoProvider } from '../lambda/LambdaApplicationInfoProvider';
import ThundraTracer from '../opentracing/Tracer';
import ThundraConfig from '../plugins/config/ThundraConfig';

const ThundraWarmup = require('@thundra/warmup');
const get = require('lodash.get');

export let tracer: ThundraTracer;

interface WrappedFunction extends Function {
    thundraWrapped?: boolean;
}

/**
 * Creates a function that wraps the original
 * AWS Lambda handler with Thundra's wrapper
 * @param config options
 * @returns wrapper function
 */
export function createWrapper(config: ThundraConfig): (f: Function) => Function {
    if (config.disableThundra) {
        return (originalFunc) => originalFunc;
    }
    if (!(config.apiKey)) {
        console.warn(`Thundra API Key is not given, monitoring is disabled.`);
    }
    if (config.trustAllCert) {
        Utils.setEnvVar(EnvVariableKeys.NODE_TLS_REJECT_UNAUTHORIZED, '0');
    }

    ApplicationManager.setApplicationInfoProvider(new LambdaApplicationInfoProvider());

    return createWrapperWithPlugins(config, createPlugins(config));
}

/**
 * Creates a function that wraps the original
 * AWS Lambda handler with Thundra's wrapper
 * @param config options
 * @param plugins plugins to be attached to the wrapped function
 * @returns wrapper function
 */
function createWrapperWithPlugins(config: ThundraConfig, plugins: any[]): (f: Function) => Function {
    return (originalFunc: any) => {
        if (isWrapped(originalFunc)) {
            return originalFunc;
        }

        const pluginContext = createPluginContext(config);

        plugins.forEach((plugin: any) => {
            plugin.setPluginContext(pluginContext);
        });

        const wrappedHandler = createWrappedHandler(pluginContext, originalFunc, plugins, config);

        if (config.warmupAware) {
            const increaseRequestCount = () => pluginContext.requestCount++;
            const warmupWrapper = ThundraWarmup(increaseRequestCount);
            return warmupWrapper(wrappedHandler);
        }

        return wrappedHandler;
    };
}

/**
 * Creates a wrapped handler function given the original handler
 * @param pluginContext plugin context object that contains the information might be needed by the plugins
 * @param originalFunc original AWS Lambda handler
 * @param plugins plugins to be attached to the wrapped function
 * @param config Thundra configuration
 * @returns new AWS Lambda handler wrapped with Thundra
 */
function createWrappedHandler(pluginContext: PluginContext, originalFunc: Function,
                              plugins: any[], config: ThundraConfig): WrappedFunction {
    const wrappedFunction = async (originalEvent: any, originalContext: any, originalCallback: any) => {
        LambdaContextProvider.setContext(originalContext);
        // Creating applicationId here, since we need the information in context
        pluginContext.applicationId = ApplicationManager.getApplicationInfo().applicationId;

        const thundraWrapper = new ThundraWrapper(
            this,
            originalEvent,
            originalContext,
            originalCallback,
            originalFunc,
            plugins,
            pluginContext,
            config,
        );
        return await thundraWrapper.invoke();
    };

    setWrapped(wrappedFunction, true);

    return wrappedFunction;
}

/**
 * Creates a new plugin context
 * @param config Thundra configuration
 * @returns new PluginContext object
 */
function createPluginContext(config: ThundraConfig): PluginContext {
    const applicationInfo = ApplicationManager.getApplicationInfo();
    const pluginContext: PluginContext = new PluginContext({
        applicationInstanceId: applicationInfo.applicationInstanceId,
        applicationRegion: applicationInfo.applicationRegion,
        applicationVersion: applicationInfo.applicationVersion,
        requestCount: 0,
        apiKey: config.apiKey,
        timeoutMargin: config.timeoutMargin,
        transactionId: null,
    });

    return pluginContext;
}

/**
 * Creates plugins given a configuration
 * @param config Thundra configuration
 * @returns list of plugins
 */
function createPlugins(config: ThundraConfig): any[] {
    const plugins: any[] = [];

    if (!config.disableMonitoring) {
        if (!ConfigProvider.get<boolean>(ConfigNames.THUNDRA_TRACE_DISABLE) && config.traceConfig.enabled) {
            const tracePlugin = TracePlugin(config.traceConfig);
            plugins.push(tracePlugin);

            tracer = tracePlugin.tracer;
            config.metricConfig.tracer = tracer;
            config.logConfig.tracer = tracer;
            InvocationTraceSupport.tracer = tracer;
        }

        if (!ConfigProvider.get<boolean>(ConfigNames.THUNDRA_METRIC_DISABLE) && config.metricConfig.enabled) {
            const metricPlugin = MetricPlugin(config.metricConfig);
            plugins.push(metricPlugin);
        }

        if (!ConfigProvider.get<boolean>(ConfigNames.THUNDRA_LOG_DISABLE) && config.logConfig.enabled) {
            if (!Log.getInstance()) {
                const logPlugin = new Log(config.logConfig);
                Logger.getLogManager().addListener(logPlugin);
            }
            const logInstance = Log.getInstance();
            logInstance.enable();
            plugins.push(logInstance);
        }

        const invocationPlugin = InvocationPlugin(config.invocationConfig);
        plugins.push(invocationPlugin);
    }

    return plugins;
}

/**
 * Marks given function as wrapped by thundra
 * @param func Function to be marked
 * @param wrapped value to be marked
 */
function setWrapped(func: WrappedFunction, wrapped: boolean) {
    if (func) {
        func.thundraWrapped = wrapped;
    }
}

/**
 * Returns if the given function is wrapped by Thundra
 * @param func Function to be checked
 * @return true if wrapped by Thundra, false otherwise
 */
function isWrapped(func: WrappedFunction) {
    return get(func, 'thundraWrapped', false);
}
