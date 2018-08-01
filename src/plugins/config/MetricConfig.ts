import BasePluginConfig from './BasePluginConfig';
const koalas = require('koalas');

class MetricConfig extends BasePluginConfig {
    constructor(options: any) {
        options = options ? options : {};
        super(koalas(options.enabled, true));
    }
}

export default MetricConfig;
