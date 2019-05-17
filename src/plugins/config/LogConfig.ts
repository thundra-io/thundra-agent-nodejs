import BasePluginConfig from './BasePluginConfig';
import LogSamplerConfig from './LogSamplerConfig';
const koalas = require('koalas');

class LogConfig extends BasePluginConfig {
    samplerConfig: LogSamplerConfig;

    constructor(options: any) {
        options = options ? options : {};
        super(koalas(options.enabled, true));

        this.samplerConfig = new LogSamplerConfig(options.samplerConfig);
    }
}

export default LogConfig;
