import ThundraWrapper from './ThundraWrapper';
import TracePlugin, { Trace } from './plugins/Trace';
import MetricPlugin from './plugins/Metric';
import InvocationPlugin from './plugins/Invocation';
const ThundraWarmup = require('@thundra/warmup');

const shouldDisable = (disableByEnv: any, disableByParameter: any) => {
    if (disableByEnv === 'true') {
        return true;
    } else if (disableByEnv === 'false') {
        return false;
    } else {
        return disableByParameter;
    }
};

let tracePlugin: Trace = null;

module.exports = (config: any) => {
    let apiKey: string = '';
    let timeoutMargin: number = 200;

    // tslint:disable-next-line:one-variable-per-declaration
    let disableTrace, disableMetric, disableThundra, plugins: any = [];
    if (config) {
        apiKey = config.apiKey;
        disableTrace = config.disableTrace ? config.disableTrace : false;
        disableMetric = config.disableMetric ? config.disableMetric : false;
        disableThundra = config.disableThundra ? config.disableThundra : false;
        plugins = config.plugins && Array.isArray(config.plugins) ? config.plugins : plugins;
    }

    apiKey = process.env.thundra_apiKey ? process.env.thundra_apiKey : apiKey;

    timeoutMargin = process.env.thundra_lambda_timeout_margin
        ? parseInt(process.env.thundra_lambda_timeout_margin, 0) : timeoutMargin;

    if (!apiKey || shouldDisable(process.env.thundra_disable, disableThundra)) {
        return (originalFunc: any) => originalFunc;
    }

    const invocationPlugin = InvocationPlugin({});
    plugins.push(invocationPlugin);

    if (!shouldDisable(process.env.thundra_trace_disable, disableTrace)) {
        const traceOptions = {
            disableRequest: shouldDisable(process.env.thundra_lambda_trace_request_skip, false),
            disableResponse: shouldDisable(process.env.thundra_lambda_trace_response_skip, false),
        };
        tracePlugin = TracePlugin(traceOptions);
        plugins.push(tracePlugin);
    }

    if (!shouldDisable(process.env.thundra_metric_disable, disableMetric)) {
        const metricPlugin = MetricPlugin({});
        plugins.push(metricPlugin);
    }

    const pluginContext = {
        applicationId: process.env.AWS_LAMBDA_LOG_STREAM_NAME.split(']').pop(),
        applicationProfile: process.env.thundra_applicationProfile ? process.env.thundra_applicationProfile : 'default',
        applicationRegion: process.env.AWS_REGION,
        applicationVersion: process.env.AWS_LAMBDA_FUNCTION_VERSION,
        requestCount: 0,
        apiKey,
        timeoutMargin,
        skipHttpResponseCheck: process.env.thundra_lambda_http_responseCheck_skip === 'true' ? true : false,
    };

    plugins.forEach((plugin: any) => {
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
                plugins,
                pluginContext,
                apiKey,
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
