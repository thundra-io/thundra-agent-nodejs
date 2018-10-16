import BasePluginConfig from './BasePluginConfig';
const koalas = require('koalas');

class DurationAwareSamplerConfig extends BasePluginConfig {
    duration: number;
    longerThan: boolean;

    constructor(options: any) {
        options = options ? options : {};
        super(koalas(options.enabled, false));
        this.duration = options.duration;
        this.longerThan = options.longerThan;
    }
}

export default DurationAwareSamplerConfig;
