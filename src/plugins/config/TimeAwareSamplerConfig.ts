
import BasePluginConfig from './BasePluginConfig';
import { envVariableKeys } from '../../Constants';
import Utils from '../utils/Utils';
const koalas = require('koalas');

class TimeAwareSamplerConfig extends BasePluginConfig {
    timeFreq: number;

    constructor(options: any) {
        options = options ? options : {};
        super(koalas(options.enabled, true));

        const freq = koalas(Utils.getConfiguration(
            envVariableKeys.THUNDRA_AGENT_METRIC_TIME_AWARE_SAMPLER_TIME_FREQ) , options.timeFreq, 300000);

        this.timeFreq = parseInt(freq, 10);
    }
}

export default TimeAwareSamplerConfig;
