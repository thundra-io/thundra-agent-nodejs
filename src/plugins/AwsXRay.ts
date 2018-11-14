/*
*
* Calculates duration of the lambda handler function.
*
* Generates trace report data.
*
* Adds the trace report to the Reporter instance if async monitoring is not enabled (environment variable
* thundra_lambda_publish_cloudwatch_enable is not set), otherwise it logs the report for async monitoring.
*
*/

import PluginContext from './PluginContext';
import AwsXRayConfig from './config/AwsXRayConfig';
import ThundraTracer from '../opentracing/Tracer';
import AwsXRayThundraSpanListener from './listeners/AwsXRayThundraSpanListener';
import ThundraLogger from '../ThundraLogger';

class AwsXRay {
    hooks: { 'before-invocation': (data: any) => void; 'after-invocation': (data: any) => void; };
    config: AwsXRayConfig;
    pluginContext: PluginContext;
    pluginOrder: number = 4;

    constructor(config: AwsXRayConfig) {
        this.hooks = {
            'before-invocation': this.beforeInvocation,
            'after-invocation': this.afterInvocation,
        };

        this.config = config;

        const tracer = ThundraTracer.getInstance();
        if (tracer) {
            tracer.addSpanListener(new AwsXRayThundraSpanListener(this.pluginContext));
        } else {
            ThundraLogger.getInstance().error(
                'Trace plugin is not enabled, AwsXRay plugin requires Thundra Trace Plugin.');
        }
    }

    setPluginContext = (pluginContext: PluginContext) => {
        this.pluginContext = pluginContext;
    }

    // tslint:disable-next-line:no-empty
    beforeInvocation = (data: any) => {};

    // tslint:disable-next-line:no-empty
    afterInvocation = (data: any) => {};
}

export default function instantiateAwsXRayPlugin(config: AwsXRayConfig) {
    return new AwsXRay(config);
}
