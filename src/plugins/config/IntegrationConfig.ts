import BasePluginConfig from './BasePluginConfig';
const get = require('lodash.get');

/**
 * Configures integration
 */
class IntegrationConfig  extends BasePluginConfig {

    name: string;
    options: any;

    constructor(name: string, options: any) {
        super(get(options, 'enabled', true));
        this.name = name;
        this.options = options;
    }

}

export default IntegrationConfig;
