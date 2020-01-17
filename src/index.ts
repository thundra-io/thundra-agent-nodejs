import ThundraWrapper from './ThundraWrapper';
import TracePlugin from './plugins/Trace';
import MetricPlugin from './plugins/Metric';
import AwsXRayPlugin from './plugins/AwsXRay';
import InvocationPlugin from './plugins/Invocation';
import ThundraConfig from './plugins/config/ThundraConfig';
import TraceConfig from './plugins/config/TraceConfig';
import MetricConfig from './plugins/config/MetricConfig';
import InvocationConfig from './plugins/config/InvocationConfig';
import { TraceableConfig } from '@thundra/instrumenter';
import IntegrationConfig from './plugins/config/IntegrationConfig';
import Utils from './plugins/utils/Utils';
import LogConfig from './plugins/config/LogConfig';
import PluginContext from './plugins/PluginContext';
import ThundraTracer from './opentracing/Tracer';
import { envVariableKeys } from './Constants';
import TimeAwareSamplerConfig from './plugins/config/TimeAwareSamplerConfig';
import Logger from './plugins/Logger';
import Log from './plugins/Log';
import AwsXRayConfig from './plugins/config/AwsXRayConfig';
import InvocationSupport from './plugins/support/InvocationSupport';
import InvocationTraceSupport from './plugins/support/InvocationTraceSupport';
import ApplicationSupport from './plugins/support/ApplicationSupport';
import ErrorInjectorSpanListener from './plugins/listeners/ErrorInjectorSpanListener';
import FilteringSpanListener from './plugins/listeners/FilteringSpanListener';
import LatencyInjectorSpanListener from './plugins/listeners/LatencyInjectorSpanListener';
import TagInjectorSpanListener from './plugins/listeners/TagInjectorSpanListener';
import StandardSpanFilter from './plugins/listeners/StandardSpanFilter';
import CompositeSpanFilter from './plugins/listeners/CompositeSpanFilter';
import StandardSpanFilterer from './plugins/listeners/StandardSpanFilterer';
import CompositeSampler from './opentracing/sampler/CompositeSampler';
import CountAwareSampler from './opentracing/sampler/CountAwareSampler';
import DurationAwareSampler from './opentracing/sampler/DurationAwareSampler';
import ErrorAwareSampler from './opentracing/sampler/ErrorAwareSampler';
import TimeAwareSampler from './opentracing/sampler/TimeAwareSampler';
import { SamplerCompositionOperator } from './opentracing/sampler/CompositeSampler';

const ThundraWarmup = require('@thundra/warmup');
const get = require('lodash.get');
let tracer: ThundraTracer;

module.exports = (options?: any) => {
    const config = new ThundraConfig(options);
    const plugins: any[] = [];

    if (!(config.apiKey) || config.disableThundra) {
        return (originalFunc: any) => originalFunc;
    }

    if (!(Utils.getConfiguration(envVariableKeys.THUNDRA_DISABLE_TRACE) === 'true') && config.traceConfig.enabled) {
        const tracePlugin = TracePlugin(config.traceConfig);
        plugins.push(tracePlugin);

        tracer = tracePlugin.tracer;
        config.metricConfig.tracer = tracer;
        config.logConfig.tracer = tracer;
        config.xrayConfig.tracer = tracer;
        InvocationTraceSupport.tracer = tracer;
    }

    if (!(Utils.getConfiguration(envVariableKeys.THUNDRA_DISABLE_METRIC, 'true') === 'true') && config.metricConfig.enabled) {
        const metricPlugin = MetricPlugin(config.metricConfig);
        plugins.push(metricPlugin);
    }

    if (!(Utils.getConfiguration(envVariableKeys.THUNDRA_DISABLE_LOG, 'true') === 'true') && config.logConfig.enabled) {
        if (!Log.getInstance()) {
            const logPlugin = new Log(config.logConfig);
            Logger.getLogManager().addListener(logPlugin);
        }
        const logInstance = Log.getInstance();
        logInstance.enable();
        plugins.push(logInstance);
    }

    if (!(Utils.getConfiguration(envVariableKeys.THUNDRA_DISABLE_XRAY) === 'true') && config.xrayConfig.enabled) {
        const aws = AwsXRayPlugin(config.metricConfig);
        plugins.push(aws);
    }

    const invocationPlugin = InvocationPlugin(config.invocationConfig);
    plugins.push(invocationPlugin);

    if (config.trustAllCert) {
        process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';
    }

    ApplicationSupport.parseApplicationTags();

    const logStreamName = Utils.getConfiguration(envVariableKeys.AWS_LAMBDA_LOG_STREAM_NAME);
    const region = Utils.getConfiguration(envVariableKeys.AWS_REGION);
    const functionVersion = Utils.getConfiguration(envVariableKeys.AWS_LAMBDA_FUNCTION_VERSION);
    const applicationInstanceId = logStreamName ? logStreamName.split(']').pop() : Utils.generateId();

    const pluginContext: PluginContext = new PluginContext({
        applicationInstanceId,
        applicationRegion: region ? region : '',
        applicationVersion: functionVersion ? functionVersion : '',
        requestCount: 0,
        apiKey: config.apiKey,
        timeoutMargin: config.timeoutMargin,
        transactionId: null,
        config,
    });

    const increaseRequestCount = () => pluginContext.requestCount += 1;

    return (originalFunc: any) => {
        // Check if already wrapped
        if (get(originalFunc, 'thundraWrapped', false)) {
            return originalFunc;
        }

        const thundraWrappedHandler: any = (originalEvent: any, originalContext: any, originalCallback: any) => {
            // Creating applicationId here, since we need the information in context
            const applicationId = Utils.getApplicationId(originalContext, pluginContext);
            pluginContext.applicationId = applicationId;

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
            return thundraWrapper.invoke();
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
};

module.exports.tracer = () => {
    return tracer;
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
    TimeAwareSamplerConfig,
    AwsXRayConfig,
};

module.exports.samplers = {
    CompositeSampler,
    CountAwareSampler,
    DurationAwareSampler,
    ErrorAwareSampler,
    TimeAwareSampler,
    SamplerCompositionOperator,
};

module.exports.InvocationSupport = InvocationSupport;
module.exports.InvocationTraceSupport = InvocationTraceSupport;
module.exports.updateConfig = ThundraConfig.updateConfig;
module.exports.listeners = {
    ErrorInjectorSpanListener,
    FilteringSpanListener,
    LatencyInjectorSpanListener,
    TagInjectorSpanListener,
    StandardSpanFilter,
    CompositeSpanFilter,
    StandardSpanFilterer,
};
