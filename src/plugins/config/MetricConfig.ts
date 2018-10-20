import BasePluginConfig from './BasePluginConfig';
import MetricSamplerConfig from './MetricSamplerConfig';
const koalas = require('koalas');

class MetricConfig extends BasePluginConfig {
    samplerConfig: MetricSamplerConfig;

    constructor(options: any) {
        options = options ? options : {};
        super(koalas(options.enabled, true));
        this.samplerConfig = new MetricSamplerConfig(options.samplerConfig);
    }
}

export default MetricConfig;
