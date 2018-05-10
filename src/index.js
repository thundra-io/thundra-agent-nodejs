import ThundraWarmup from '@thundra/warmup';
import ThundraWrapper from './thundra-wrapper';
import Trace from './plugins/trace';
import Metric from './plugins/metric';


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

    plugins = shouldDisable(process.env.thundra_trace_disable, disableTrace) ? plugins : [...plugins, Trace()];
    plugins = shouldDisable(process.env.thundra_metric_disable, disableMetric) ? plugins : [...plugins, Metric()];

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

        const warmupWrappedHandler = warmupWrapper(thundraWrappedHandler);

        return warmupWrappedHandler;
    };
};

