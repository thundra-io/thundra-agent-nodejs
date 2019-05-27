import BasePluginConfig from './BasePluginConfig';
import Sampler from '../../opentracing/sampler/Sampler';
const koalas = require('koalas');

class LogConfig extends BasePluginConfig {
    sampler: Sampler<any>;

    constructor(options: any) {
        options = options ? options : {};
        super(koalas(options.enabled, true));
        this.sampler = options.sampler;
    }
}

export default LogConfig;
