/**
 * Wraps the original AWS Lambda handler to hook into AWS Lambda invocation cycle
 */

import LambdaHandlerWrapper from './LambdaHandlerWrapper';
import TracePlugin from '../../plugins/Trace';
import MetricPlugin from '../../plugins/Metric';
import InvocationPlugin from '../../plugins/Invocation';
import ConfigProvider from '../../config/ConfigProvider';
import Utils from '../../utils/Utils';
import PluginContext from '../../plugins/PluginContext';
import { EnvVariableKeys } from '../../Constants';
import LogPlugin from '../../plugins/Log';
import ConfigNames from '../../config/ConfigNames';
import { ApplicationManager } from '../../application/ApplicationManager';
import { LambdaApplicationInfoProvider } from './LambdaApplicationInfoProvider';
import ThundraConfig from '../../plugins/config/ThundraConfig';
import { ApplicationInfo } from '../../application/ApplicationInfo';
import { LambdaContextProvider } from './LambdaContextProvider';
import * as LambdaExecutor from './LambdaExecutor';
import ExecutionContextManager from '../../context/ExecutionContextManager';
import ThundraTracer from '../../opentracing/Tracer';
import ExecutionContext from '../../context/ExecutionContext';
import { LambdaPlatformUtils } from './LambdaPlatformUtils';
import ThundraLogger from '../../ThundraLogger';

const get = require('lodash.get');

interface WrappedFunction extends Function {
    thundraWrapped?: boolean;
}

/**
 * Creates a function that wraps the original
 * AWS Lambda handler with Thundra's wrapper
 * @return the wrapper function
 */
export function createWrapper(): (f: Function) => WrappedFunction {
    ThundraLogger.debug('<LambdaWrapper> Creating Lambda wrapper ...');

    const config = ConfigProvider.thundraConfig;

    if (config.disableThundra) {
        ThundraLogger.debug(
            '<LambdaWrapper> Thundra disabled, so skipped wrapping and returning original function');
        return (originalFunc) => originalFunc;
    }
    if (!(config.apiKey)) {
        console.warn('Thundra API Key is not given, monitoring is disabled.');
    }
    if (config.trustAllCert) {
        Utils.setEnvVar(EnvVariableKeys.NODE_TLS_REJECT_UNAUTHORIZED, '0');
    }

    ExecutionContextManager.init();

    ApplicationManager.setApplicationInfoProvider(new LambdaApplicationInfoProvider());
    const applicationInfo = ApplicationManager.getApplicationInfo();

    const pluginContext = createPluginContext(config, applicationInfo);
    const plugins = createPlugins(config, pluginContext);

    return createWrapperWithPlugins(config, plugins, pluginContext);
}

/**
 * Creates a function that wraps the original AWS Lambda handler with Thundra's wrapper
 * @param {ThundraConfig} config the {@link ThundraConfig}
 * @param plugins plugins to be attached to the wrapped function
 * @param {PluginContext} pluginContext the {@link PluginContext} object that contains the
 * information might be needed by the plugins
 * @return the wrapper function
 */
function createWrapperWithPlugins(config: ThundraConfig,
                                  plugins: any[],
                                  pluginContext: PluginContext): (f: Function) => WrappedFunction {
    return (originalFunc: any) => {
        if (isWrapped(originalFunc)) {
            ThundraLogger.debug(
                '<LambdaWrapper> Already wrapped by Lambda wrapper, \
                so skipped wrapping original function:', originalFunc.name);
            return originalFunc;
        }

        const wrappedHandler = createWrappedHandler(pluginContext, originalFunc, plugins, config);
        ThundraLogger.debug('<LambdaWrapper> Wrapped with Lambda wrapper:', originalFunc.name);

        if (config.warmupAware) {
            const ThundraWarmup = require('@thundra/warmup');
            const warmupWrapper = ThundraWarmup(() => pluginContext.requestCount++);
            ThundraLogger.debug(
                '<LambdaWrapper> Wrapped with warmup aware wrapper for detecting warmup requests');
            return warmupWrapper(wrappedHandler);
        }

        return wrappedHandler;
    };
}

/**
 * Creates a wrapped handler function given the original handler
 * @param {PluginContext} pluginContext the {@link PluginContext} object that contains the
 * information might be needed by the plugins
 * @param {Function} originalFunc original AWS Lambda handler
 * @param plugins plugins to be attached to the wrapped function
 * @param {ThundraConfig} config the {@link ThundraConfig}
 * @return {WrappedFunction} new AWS Lambda handler wrapped with Thundra
 */
function createWrappedHandler(pluginContext: PluginContext, originalFunc: Function,
                              plugins: any[], config: ThundraConfig): WrappedFunction {
    const wrappedFunction = (originalEvent: any,
                             originalContext: any,
                             originalCallback: any) => ExecutionContextManager.runWithContext(
        createExecContext,
        async () => {
            LambdaContextProvider.setContext(originalContext);
            ApplicationManager.getApplicationInfoProvider().update({
                applicationId: LambdaPlatformUtils.getApplicationId(originalContext),
            });

            const thundraWrapper = new LambdaHandlerWrapper(
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
        },
    );

    setWrapped(wrappedFunction, true);

    return wrappedFunction;
}

/**
 * Creates {@link ExecutionContext}
 * @return {ExecutionContext} the created {@link ExecutionContext}
 */
function createExecContext(): ExecutionContext {
    const thundraConfig = ConfigProvider.thundraConfig;
    const tracerConfig = get(thundraConfig, 'traceConfig.tracerConfig', {});

    const tracer = new ThundraTracer(tracerConfig);
    const transactionId = Utils.generateId();

    tracer.setTransactionId(transactionId);

    const execContext: ExecutionContext = new ExecutionContext({
        tracer,
        transactionId,
    });
    if (ThundraLogger.isDebugEnabled()) {
        ThundraLogger.debug('<LambdaWrapper> Created execution context:', execContext.summary());
    }
    return execContext;
}

/**
 * Creates a new {@link PluginContext} object
 * @param {ThundraConfig} config the {@link ThundraConfig}
 * @return {PluginContext} the created new {@link PluginContext} object
 */
function createPluginContext(config: ThundraConfig, applicationInfo: ApplicationInfo): PluginContext {
    const pluginContext: PluginContext = new PluginContext({
        applicationInfo,
        requestCount: 0,
        apiKey: config.apiKey,
        timeoutMargin: config.timeoutMargin,
        executor: LambdaExecutor,
    });
    if (ThundraLogger.isDebugEnabled()) {
        ThundraLogger.debug('<LambdaWrapper> Created plugin context:', pluginContext.summary());
    }
    return pluginContext;
}

/**
 * Creates plugins given a configuration
 * @param {ThundraConfig} config Thundra configuration
 * @param {PluginContext} pluginContext the {@link PluginContext} object that contains the
 * information might be needed by the plugins
 * @return list of plugins
 */
function createPlugins(config: ThundraConfig, pluginContext: PluginContext): any[] {
    const plugins: any[] = [];

    if (config.disableMonitoring) {
        return plugins;
    }

    if (!ConfigProvider.get<boolean>(ConfigNames.THUNDRA_TRACE_DISABLE) && config.traceConfig.enabled) {
        plugins.push(new TracePlugin(config.traceConfig));
        ThundraLogger.debug('<LambdaWrapper> Created and registered trace plugin');
    }

    if (!ConfigProvider.get<boolean>(ConfigNames.THUNDRA_METRIC_DISABLE) && config.metricConfig.enabled) {
        plugins.push(new MetricPlugin(config.metricConfig));
        ThundraLogger.debug('<LambdaWrapper> Created and registered metric plugin');
    }

    if (!ConfigProvider.get<boolean>(ConfigNames.THUNDRA_LOG_DISABLE) && config.logConfig.enabled) {
        plugins.push(new LogPlugin(config.logConfig));
        ThundraLogger.debug('<LambdaWrapper> Created and registered log plugin');
    }

    plugins.push(new InvocationPlugin(config.invocationConfig));
    ThundraLogger.debug('<LambdaWrapper> Created and registered invocation plugin');

    // Set plugin context for plugins
    plugins.forEach((plugin: any) => { plugin.setPluginContext(pluginContext); });

    return plugins;
}

/**
 * Marks given function as wrapped by Thundra
 * @param {WrappedFunction} func the function to be marked
 * @param {boolean} the wrapped value to be marked
 */
function setWrapped(func: WrappedFunction, wrapped: boolean) {
    if (func) {
        func.thundraWrapped = wrapped;
    }
}

/**
 * Returns if the given function is wrapped by Thundra
 * @param {WrappedFunction} func the function to be checked
 * @return {@code true} if wrapped by Thundra, {@code false} otherwise
 */
function isWrapped(func: WrappedFunction) {
    return get(func, 'thundraWrapped', false);
}
