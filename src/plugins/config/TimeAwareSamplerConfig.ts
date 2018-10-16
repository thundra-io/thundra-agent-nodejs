
import BasePluginConfig from './BasePluginConfig';

const koalas = require('koalas');
class TimeAwareSamplerConfig extends BasePluginConfig {
    timeFreq: number;

    constructor(options: any) {
        options = options ? options : {};
        super(koalas(options.enabled, false));
        this.timeFreq = options.timeFreq;
    }
}

export default TimeAwareSamplerConfig;
