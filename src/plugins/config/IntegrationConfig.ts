import BasePluginConfig from './BasePluginConfig';
const koalas = require('koalas');
class IntegrationConfig  extends BasePluginConfig {
    name: string;
    options: any;
    constructor(name: string, options: any) {
        super(koalas(options.enabled, true));
        this.name = name;
        this.options = options;
    }
}

export default IntegrationConfig;
