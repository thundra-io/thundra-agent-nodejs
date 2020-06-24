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

/**
 * Returns a function that wraps the original
 * AWS Lambda handler with Thundra's wrapper
 * @param config options
 * @returns wrapper function
 */
export function createWrapper(config: ThundraConfig): (f: Function) => Function {
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

    if (config.trustAllCert) {
        Utils.setEnvVar(EnvVariableKeys.NODE_TLS_REJECT_UNAUTHORIZED, '0');
        process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';
    }

    return (originalFunc: any) => {
        // Check if already wrapped
        if (get(originalFunc, 'thundraWrapped', false)) {
            return originalFunc;
        }

        ApplicationManager.setApplicationInfoProvider(new LambdaApplicationInfoProvider());
        const applicationInfo = ApplicationManager.getApplicationInfo();
        const pluginContext: PluginContext = new PluginContext({
            applicationInstanceId: applicationInfo.applicationInstanceId,
            applicationRegion: applicationInfo.applicationRegion,
            applicationVersion: applicationInfo.applicationVersion,
            requestCount: 0,
            apiKey: config.apiKey,
            timeoutMargin: config.timeoutMargin,
            transactionId: null,
            config,
        });

        const increaseRequestCount = () => pluginContext.requestCount += 1;

        const thundraWrappedHandler: any = async (originalEvent: any, originalContext: any, originalCallback: any) => {
            LambdaContextProvider.setContext(originalContext);
            // Creating applicationId here, since we need the information in context
            pluginContext.applicationId = ApplicationManager.getApplicationInfo().applicationId;

            plugins.forEach((plugin: any) => {
                plugin.setPluginContext(pluginContext);
            });

            const originalThis = this;
            const thundraWrapper = new ThundraWrapper(
                originalThis,
                originalEvent,
                originalContext,
                originalCallback,
                originalFunc,
                plugins,
                pluginContext,
            );
            return await thundraWrapper.invoke();
        };
        // Set thundraWrapped to true, to not double wrap the user handler
        thundraWrappedHandler.thundraWrapped = true;

        if (config.warmupAware) {
            const warmupWrapper = ThundraWarmup(increaseRequestCount);
            return warmupWrapper(thundraWrappedHandler);
        } else {
            return thundraWrappedHandler;
        }
    };
}
