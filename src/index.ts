import ThundraWrapper from './ThundraWrapper';
import TracePlugin, { Trace } from './plugins/Trace';
import MetricPlugin from './plugins/Metric';
import InvocationPlugin from './plugins/Invocation';
import ThundraConfig from './plugins/config/ThundraConfig';
import TraceConfig from './plugins/config/TraceConfig';
import MetricConfig from './plugins/config/MetricConfig';
import InvocationConfig from './plugins/config/InvocationConfig';
import TraceDef from './plugins/config/TraceDef';
import Utils from './plugins/Utils';

const ThundraWarmup = require('@thundra/warmup');

let tracePlugin: Trace = null;

module.exports = (options: any) => {
    const config = new ThundraConfig(options);

    if (!config.apiKey || config.disableThundra) {
        return (originalFunc: any) => originalFunc;
    }

    const invocationPlugin = InvocationPlugin(config.invocationConfig);
    config.plugins.push(invocationPlugin);

    if (!(process.env.thundra_trace_disable === 'true') && config.traceConfig.enabled) {
        tracePlugin = TracePlugin(config.traceConfig);
        config.plugins.push(tracePlugin);
    }

    if (!(process.env.thundra_metric_disable === 'true') && config.metricConfig.enabled) {
        const metricPlugin = MetricPlugin(config.metricConfig);
        config.plugins.push(metricPlugin);
    }
    const applicationId = process.env.AWS_LAMBDA_LOG_STREAM_NAME ?
                          process.env.AWS_LAMBDA_LOG_STREAM_NAME.split(']').pop() :
                          Utils.generateId();

    const pluginContext = {
        applicationId,
        applicationProfile: process.env.thundra_applicationProfile ? process.env.thundra_applicationProfile : 'default',
        applicationRegion: process.env.AWS_REGION,
        applicationVersion: process.env.AWS_LAMBDA_FUNCTION_VERSION,
        requestCount: 0,
        apiKey: config.apiKey,
        timeoutMargin: config.timeoutMargin,
        skipHttpResponseCheck: process.env.thundra_lambda_http_responseCheck_skip === 'true' ? true : false,
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

module.exports.tracer = function getTracer() {
    if (tracePlugin) {
        return tracePlugin.tracer;
    } else {
        throw new Error('Trace plugin is not enabled.');
    }
};

module.exports.config = {
    ThundraConfig,
    TraceConfig,
    MetricConfig,
    InvocationConfig,
    TraceDef,
};
