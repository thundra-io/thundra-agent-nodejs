import BasePluginConfig from './BasePluginConfig';

class MetricConfig extends BasePluginConfig {
    constructor(options: any) {
        options = options ? options : {};
        super(options.enabled);
    }
}

export default MetricConfig;
