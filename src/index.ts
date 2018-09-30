import ThundraWrapper from './ThundraWrapper';
import TracePlugin, { Trace } from './plugins/Trace';
import MetricPlugin from './plugins/Metric';
import LogPlugin from './plugins/Log';
import InvocationPlugin from './plugins/Invocation';
import ThundraConfig from './plugins/config/ThundraConfig';
import TraceConfig from './plugins/config/TraceConfig';
import MetricConfig from './plugins/config/MetricConfig';
import InvocationConfig from './plugins/config/InvocationConfig';
import TraceDef from './plugins/config/TraceDef';
import IntegrationConfig from './plugins/config/IntegrationConfig';
import Utils from './plugins/Utils';
import LogConfig from './plugins/config/LogConfig';
import PluginContext from './plugins/PluginContext';
import ThundraTracer from './opentracing/Tracer';
import LogManager from './plugins/LogManager';
import { envVariableKeys } from './Constants';

const ThundraWarmup = require('@thundra/warmup');

let tracePlugin: Trace = null;
let logManager: LogManager = null;

module.exports = (options: any) => {
    const config = new ThundraConfig(options);

    if (!config.apiKey || config.disableThundra) {
        return (originalFunc: any) => originalFunc;
    }

    if (!(Utils.getConfiguration(envVariableKeys.THUNDRA_DISABLE_TRACE) === 'true') || config.traceConfig.enabled) {
        tracePlugin = TracePlugin(config.traceConfig);
        config.plugins.push(tracePlugin);
    }

    if (!(Utils.getConfiguration(envVariableKeys.THUNDRA_DISABLE_METRIC) === 'true') || config.metricConfig.enabled) {
        const metricPlugin = MetricPlugin(config.metricConfig);
        config.plugins.push(metricPlugin);
    }

    if (!(Utils.getConfiguration(envVariableKeys.THUNDRA_DISABLE_LOG) === 'true') || config.logConfig.enabled) {
        const logPlugin = LogPlugin(config.logConfig);
        logManager = new LogManager();
        logManager.addListener(logPlugin);
        config.plugins.push(logPlugin);
    }

    const invocationPlugin = InvocationPlugin(config.invocationConfig);
    config.plugins.push(invocationPlugin);

    if (config.trustAllCert) {
        process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';
    }

    const logStreamName = Utils.getConfiguration(envVariableKeys.AWS_LAMBDA_LOG_STREAM_NAME);
    const applicationId = logStreamName ? logStreamName.split(']').pop() : Utils.generateId();

    const pluginContext: PluginContext = {
        applicationId,
        applicationRegion: Utils.getConfiguration(envVariableKeys.AWS_REGION),
        applicationVersion:  Utils.getConfiguration(envVariableKeys.AWS_LAMBDA_FUNCTION_VERSION),
        requestCount: 0,
        apiKey: config.apiKey,
        timeoutMargin: config.timeoutMargin,
    };

    config.plugins.forEach((plugin: any) => {
        plugin.setPluginContext(pluginContext);
    });

    const increaseRequestCount = () => pluginContext.requestCount += 1;
    const warmupWrapper = ThundraWarmup(increaseRequestCount);

    return (originalFunc: any) => {

        const thundraWrappedHandler = (originalEvent: any, originalContext: any, originalCallback: any) => {
            const originalThis = this;
            const thundraWrapper = new ThundraWrapper(
                originalThis,
                originalEvent,
                originalContext,
                originalCallback,
                originalFunc,
                config.plugins,
                pluginContext,
                config.apiKey,
            );
            return thundraWrapper.invoke();
        };

        return warmupWrapper(thundraWrappedHandler);
    };
};

module.exports.tracer = () => {
    if (tracePlugin) {
        return ThundraTracer.getInstance();
    } else {
        throw new Error('Trace plugin is not enabled.');
    }
};

module.exports.createLogger = (options: any) => {
    if (logManager) {
        return logManager.createLogger(options);
    } else {
        throw new Error('Log plugin is not enabled.');
    }
};

module.exports.addLogListener = (listener: any) => {
    if (logManager) {
        return logManager.addListener(listener);
    } else {
        throw new Error('Log plugin is not enabled.');
    }
};

module.exports.config = {
    ThundraConfig,
    TraceConfig,
    MetricConfig,
    InvocationConfig,
    LogConfig,
    TraceDef,
    IntegrationConfig,
};
