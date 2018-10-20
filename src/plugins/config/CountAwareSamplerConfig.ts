import BasePluginConfig from './BasePluginConfig';
const koalas = require('koalas');

class CountAwareSamplerConfig extends BasePluginConfig {
    countFreq: number;

    constructor(options: any) {
        options = options ? options : {};
        super(koalas(options.enabled, false));
        this.countFreq = options.countFreq;
    }
}

export default CountAwareSamplerConfig;
