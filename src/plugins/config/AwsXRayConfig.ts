import BasePluginConfig from './BasePluginConfig';
import ThundraTracer from '../../opentracing/Tracer';
const get = require('lodash.get');

class AwsXRayConfig extends BasePluginConfig {
    tracer: ThundraTracer;

    constructor(options: any) {
        options = options ? options : {};
        super(get(options, 'enabled', false));
    }

    updateConfig(options: any) {
        this.enabled = get(options, 'xrayConfig.enabled', this.enabled);
    }
}

export default AwsXRayConfig;
