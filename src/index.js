import ThundraWarmup from '@thundra/warmup';
import ThundraWrapper from './thundra-wrapper';
import TracePlugin from './plugins/trace';
import MetricPlugin from './plugins/metric';
import InvocationPlugin from './plugins/invocation';


const shouldDisable = (disableByEnv, disableByParameter) => {
    if (disableByEnv === 'true')
        return true;
    else if (disableByEnv === 'false')
        return false;
    else
        return disableByParameter;
};

module.exports = (config) => {
    let apiKey, disableTrace, disableMetric, disableThundra, plugins = [];
    if (config) {
        apiKey = config.apiKey;
        disableTrace = config.disableTrace ? config.disableTrace : false;
        disableMetric = config.disableMetric ? config.disableMetric : false;
        disableThundra = config.disableThundra ? config.disableThundra : false;
        plugins = config.plugins && Array.isArray(config.plugins) ? config.plugins : plugins;
    }

    apiKey = process.env.thundra_apiKey ? process.env.thundra_apiKey : apiKey;

    if (!apiKey || shouldDisable(process.env.thundra_disable, disableThundra))
        return originalFunc => originalFunc;

    const invocationPlugin = InvocationPlugin();
    plugins.push(invocationPlugin);

    if (!shouldDisable(process.env.thundra_trace_disable, disableTrace)) {
        const traceOptions = {
            disableRequest: shouldDisable(process.env.thundra_lambda_trace_request_skip, false),
            disableResponse: shouldDisable(process.env.thundra_lambda_trace_response_skip, false)
        };
        const tracePlugin = TracePlugin(traceOptions);
        plugins.push(tracePlugin);
    }

    if (!shouldDisable(process.env.thundra_metric_disable, disableMetric)) {
        const metricPlugin = MetricPlugin();
        plugins.push(metricPlugin);
    }

    const pluginContext = {
        applicationId: process.env.AWS_LAMBDA_LOG_STREAM_NAME.split(']').pop(),
        applicationProfile: process.env.thundra_applicationProfile ? process.env.thundra_applicationProfile : 'default',
        applicationRegion: process.env.AWS_REGION,
        applicationVersion: process.env.AWS_LAMBDA_FUNCTION_VERSION,
        requestCount: 0,
        apiKey: apiKey
    };

    plugins.forEach(plugin => {
        plugin.setPluginContext(pluginContext);
    });

    const increaseRequestCount = () => pluginContext.requestCount += 1;

    const warmupWrapper = ThundraWarmup(increaseRequestCount);

    return originalFunc => {

        const thundraWrappedHandler = (originalEvent, originalContext, originalCallback) => {
            const originalThis = this;
            const thundraWrapper = new ThundraWrapper(
                originalThis,
                originalEvent,
                originalContext,
                originalCallback,
                originalFunc,
                plugins,
                pluginContext,
                apiKey
            );
            return thundraWrapper.invoke();
        };

        return warmupWrapper(thundraWrappedHandler);
    };
};

