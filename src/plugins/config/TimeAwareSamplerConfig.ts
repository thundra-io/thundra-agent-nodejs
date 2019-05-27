
import BasePluginConfig from './BasePluginConfig';
import { envVariableKeys } from '../../Constants';
import Utils from '../utils/Utils';
const koalas = require('koalas');

class TimeAwareSamplerConfig extends BasePluginConfig {
    timeFreq: number;

    constructor(options: any) {
        options = options ? options : {};
        super(koalas(options.enabled, false));

        const freq = koalas(options.timeFreq, 300000);

        this.timeFreq = parseInt(freq, 10);
    }
}

export default TimeAwareSamplerConfig;
