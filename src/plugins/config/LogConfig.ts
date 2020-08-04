import BasePluginConfig from './BasePluginConfig';
import Sampler from '../../opentracing/sampler/Sampler';
const get = require('lodash.get');

/**
 * Configures log plugin/support
 */
class LogConfig extends BasePluginConfig {

    sampler: Sampler<any>;

    constructor(options: any) {
        options = options ? options : {};
        super(get(options, 'enabled', true));
        this.sampler = options.sampler;
    }

    /**
     * Updates configuration by options
     * @param options the options to update configuration
     */
    updateConfig(options: any) {
        this.sampler = get(options, 'logConfig.sampler', this.sampler);
        this.enabled = get(options, 'logConfig.enabled', this.enabled);
    }

}

export default LogConfig;
