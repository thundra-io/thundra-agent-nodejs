import BasePluginConfig from './BasePluginConfig';
import Sampler from '../../opentracing/sampler/Sampler';
import ThundraTracer from '../../opentracing/Tracer';
const get = require('lodash.get');

class LogConfig extends BasePluginConfig {
    sampler: Sampler<any>;
    tracer: ThundraTracer;

    constructor(options: any) {
        options = options ? options : {};
        super(get(options, 'enabled', true));
        this.sampler = options.sampler;
    }
}

export default LogConfig;
