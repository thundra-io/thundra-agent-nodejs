import ThundraWrapper from "./src/thundra-wrapper";
import Trace from "./src/plugins/trace";
import Metric from "./src/plugins/metric";

const shouldEnablePlugin = (disableByEnv, disableByParameter) => {
    if (disableByEnv === "true")
        return false;
    else if (disableByEnv === "false")
        return true;
    else
        return !disableByParameter;
};

module.exports = (config) => {
    let apiKey, disableTrace, disableMetric, disableThundra;
    if (config) {
        apiKey = config.apiKey;
        disableTrace = config.disableTrace ? config.disableTrace : false;
        disableMetric = config.disableMetric ? config.disableMetric : false;
        disableThundra = config.disableThundra ? config.disableThundra : false;
    }

    apiKey = process.env.thundra_apiKey ? process.env.thundra_apiKey : apiKey;

    if (process.env.thundra_disable === "true" || disableThundra || !apiKey)
        return originalFunc => originalFunc;

    let plugins = [];
    plugins = shouldEnablePlugin(process.env.thundra_trace_disable, disableTrace) ? [...plugins, Trace()] : plugins;
    plugins = shouldEnablePlugin(process.env.thundra_metric_disable, disableMetric) ? [...plugins, Metric()] : plugins;

    return originalFunc => {
        return (originalEvent, originalContext, originalCallback) => {
            const originalThis = this;
            const thundraWrapper = new ThundraWrapper(
                originalThis,
                originalEvent,
                originalContext,
                originalCallback,
                originalFunc,
                plugins,
                apiKey
            );
            return thundraWrapper.invoke();
        };
    };
};

