import BasePluginConfig from './BasePluginConfig';
const koalas = require('koalas');

class LogConfig extends BasePluginConfig {
    constructor(options: any) {
        options = options ? options : {};
        super(koalas(options.enabled, true));
    }
}

export default LogConfig;
