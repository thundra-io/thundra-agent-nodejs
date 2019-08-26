import PluginContext from './PluginContext';
import AwsXRayConfig from './config/AwsXRayConfig';
import ThundraTracer from '../opentracing/Tracer';
import ThundraLogger from '../ThundraLogger';
import AwsXRayThundraSpanListener from './listeners/AwsXRayThundraSpanListener';

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

        let tracer;
        if (config) {
            tracer = config.tracer;
        }

        if (tracer) {
            tracer.addSpanListener(new AwsXRayThundraSpanListener(this));
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
