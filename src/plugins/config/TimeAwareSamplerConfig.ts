
import BasePluginConfig from './BasePluginConfig';
const get = require('lodash.get');

class TimeAwareSamplerConfig extends BasePluginConfig {
    timeFreq: number;

    constructor(options: any) {
        options = options ? options : {};
        super(get(options, 'enabled', false));

        const freq = get(options, 'timeFreq', 300000);

        this.timeFreq = parseInt(freq, 10);
    }
}

export default TimeAwareSamplerConfig;
