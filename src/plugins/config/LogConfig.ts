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

    updateConfig(options: any) {
        this.sampler = get(options, 'logConfig.sampler', this.sampler);
        this.enabled = get(options, 'logConfig.enabled', this.enabled);
    }
}

export default LogConfig;
