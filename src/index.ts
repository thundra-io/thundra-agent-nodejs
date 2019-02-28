import ThundraWrapper from './ThundraWrapper';
import TracePlugin from './plugins/Trace';
import MetricPlugin from './plugins/Metric';
import AwsXRayPlugin from './plugins/AwsXRay';
import InvocationPlugin from './plugins/Invocation';
import ThundraConfig from './plugins/config/ThundraConfig';
import TraceConfig from './plugins/config/TraceConfig';
import MetricConfig from './plugins/config/MetricConfig';
import InvocationConfig from './plugins/config/InvocationConfig';
import TraceableConfig from './plugins/config/TraceableConfig';
import IntegrationConfig from './plugins/config/IntegrationConfig';
import Utils from './plugins/utils/Utils';
import LogConfig from './plugins/config/LogConfig';
import PluginContext from './plugins/PluginContext';
import ThundraTracer from './opentracing/Tracer';
import { envVariableKeys } from './Constants';
import TraceSamplerConfig from './plugins/config/TraceSamplerConfig';
import MetricSamplerConfig from './plugins/config/MetricSamplerConfig';
import CountAwareSamplerConfig from './plugins/config/CountAwareSamplerConfig';
import DurationAwareSamplerConfig from './plugins/config/DurationAwareSamplerConfig';
import ErrorAwareSamplerConfig from './plugins/config/ErrorAwareSamplerConfig';
import TimeAwareSamplerConfig from './plugins/config/TimeAwareSamplerConfig';
import Logger from './plugins/Logger';
import Log from './plugins/Log';
import AwsXRayConfig from './plugins/config/AwsXRayConfig';
import InvocationSupport from './plugins/support/InvocationSupport';
import ApplicationSupport from './plugins/support/ApplicationSupport';
import ErrorInjectorSpanListener from './plugins/listeners/ErrorInjectorSpanListener';
import FilteringSpanListener from './plugins/listeners/FilteringSpanListener';
import LatencyInjectorSpanListener from './plugins/listeners/LatencyInjectorSpanListener';
import SpanFilter from './plugins/listeners/SpanFilter';
import StandardSpanFilterer from './plugins/listeners/StandardSpanFilterer';

const ThundraWarmup = require('@thundra/warmup');

module.exports = (options: any) => {
    const config = new ThundraConfig(options);

    if (!(config.apiKey) || config.disableThundra) {
        return (originalFunc: any) => originalFunc;
    }

    if (!(Utils.getConfiguration(envVariableKeys.THUNDRA_DISABLE_TRACE) === 'true') && config.traceConfig.enabled) {
        const tracePlugin = TracePlugin(config.traceConfig);
        config.plugins.push(tracePlugin);
    }

    if (!(Utils.getConfiguration(envVariableKeys.THUNDRA_DISABLE_METRIC) === 'true') && config.metricConfig.enabled) {
        const metricPlugin = MetricPlugin(config.metricConfig);
        config.plugins.push(metricPlugin);
    }

    if (!(Utils.getConfiguration(envVariableKeys.THUNDRA_DISABLE_LOG) === 'true') && config.logConfig.enabled) {
        if (!Log.getInstance()) {
            const logPlugin = new Log(config.logConfig);
            Logger.getLogManager().addListener(logPlugin);
        }

        config.plugins.push(Log.getInstance());
    }

    if (!(Utils.getConfiguration(envVariableKeys.THUNDRA_DISABLE_XRAY) === 'true') && config.xrayConfig.enabled) {
        const aws = AwsXRayPlugin(config.metricConfig);
        config.plugins.push(aws);
    }

    const invocationPlugin = InvocationPlugin(config.invocationConfig);
    config.plugins.push(invocationPlugin);

    if (config.trustAllCert) {
        process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';
    }

    ApplicationSupport.parseApplicationTags();

    const logStreamName = Utils.getConfiguration(envVariableKeys.AWS_LAMBDA_LOG_STREAM_NAME);
    const region =  Utils.getConfiguration(envVariableKeys.AWS_REGION);
    const functionVersion = Utils.getConfiguration(envVariableKeys.AWS_LAMBDA_FUNCTION_VERSION);
    const applicationId = logStreamName ? logStreamName.split(']').pop() : Utils.generateId();

    const pluginContext: PluginContext = {
        applicationId,
        applicationRegion: region ? region : '',
        applicationVersion: functionVersion ? functionVersion : '',
        requestCount: 0,
        apiKey: config.apiKey,
        timeoutMargin: config.timeoutMargin,
        transactionId: null,
        config,
    };

    config.plugins.forEach((plugin: any) => {
        plugin.setPluginContext(pluginContext);
    });

    const increaseRequestCount = () => pluginContext.requestCount += 1;

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

        if (config.warmupAware) {
            const warmupWrapper = ThundraWarmup(increaseRequestCount);
            return warmupWrapper(thundraWrappedHandler);
        } else {
            return thundraWrappedHandler;
        }
    };
};

module.exports.tracer = () => {
    return ThundraTracer.getInstance();
};

module.exports.createLogger = (options: any) => {
    if (!Log.getInstance()) {
        const config: LogConfig = new LogConfig({});
        const logPlugin = new Log(config);
        Logger.getLogManager().addListener(logPlugin);
    }
    return Logger.getLogManager().createLogger(options);
};

module.exports.addLogListener = (listener: any) => {
    return Logger.getLogManager().addListener(listener);
};

module.exports.config = {
    ThundraConfig,
    TraceConfig,
    MetricConfig,
    InvocationConfig,
    LogConfig,
    TraceableConfig,
    IntegrationConfig,
    TraceSamplerConfig,
    MetricSamplerConfig,
    CountAwareSamplerConfig,
    DurationAwareSamplerConfig,
    ErrorAwareSamplerConfig,
    TimeAwareSamplerConfig,
    AwsXRayConfig,
};

module.exports.InvocationSupport = InvocationSupport;

module.exports.listeners = {
    ErrorInjectorSpanListener,
    FilteringSpanListener,
    LatencyInjectorSpanListener,
    SpanFilter,
    StandardSpanFilterer,
};
