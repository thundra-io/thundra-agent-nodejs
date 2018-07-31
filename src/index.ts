import ThundraWrapper from './ThundraWrapper';
import TracePlugin, { Trace } from './plugins/Trace';
import MetricPlugin from './plugins/Metric';
import InvocationPlugin from './plugins/Invocation';
import ThundraConfig from './plugins/config/ThundraConfig';
const ThundraWarmup = require('@thundra/warmup');

let tracePlugin: Trace = null;

module.exports = (options: any) => {
    const config = new ThundraConfig(options);

    if (!config.apiKey || config.disableThundra) {
        return (originalFunc: any) => originalFunc;
    }

    const invocationPlugin = InvocationPlugin(config.invocationConfig);
    config.plugins.push(invocationPlugin);

    if (config.traceConfig.enabled) {
        tracePlugin = TracePlugin(config.traceConfig);
        config.plugins.push(tracePlugin);
    }

    if (config.metricConfig.enabled) {
        const metricPlugin = MetricPlugin(config.metricConfig);
        config.plugins.push(metricPlugin);
    }

    const pluginContext = {
        applicationId: process.env.AWS_LAMBDA_LOG_STREAM_NAME.split(']').pop(),
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
