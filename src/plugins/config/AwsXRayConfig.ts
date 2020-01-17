import BasePluginConfig from './BasePluginConfig';
import ThundraTracer from '../../opentracing/Tracer';
const get = require('lodash.get');

class AwsXRayConfig extends BasePluginConfig {
    tracer: ThundraTracer;

    constructor(options: any) {
        options = options ? options : {};
        super(get(options, 'enabled', false));
    }
}

export default AwsXRayConfig;
