import BasePluginConfig from './BasePluginConfig';
import ThundraTracer from '../../opentracing/Tracer';
const koalas = require('koalas');

class AwsXRayConfig extends BasePluginConfig {
    tracer: ThundraTracer;

    constructor(options: any) {
        options = options ? options : {};
        super(koalas(options.enabled, false));
    }
}

export default AwsXRayConfig;
