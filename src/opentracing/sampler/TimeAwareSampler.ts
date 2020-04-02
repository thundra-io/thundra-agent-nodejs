import Sampler from './Sampler';
import { envVariableKeys } from '../../Constants';
import Utils from '../../plugins/utils/Utils';
import ConfigProvider from '../../config/ConfigProvider';
import ConfigNames from '../../config/ConfigNames';

const koalas = require('koalas');

class TimeAwareSampler implements Sampler<null> {
    timeFreq: number;
    latestTime: number;

    constructor(timeFreq?: number) {
        this.timeFreq = ConfigProvider.get<number>(
            ConfigNames.THUNDRA_SAMPLER_TIMEAWARE_TIMEFREQ,
            koalas(timeFreq, undefined)); // if timeFreq is not valid, it passes undefined to get the default value
        this.latestTime = 0;
    }

    isSampled(): boolean {
        const currentTimeValue = Date.now();
        if (currentTimeValue > this.latestTime + this.timeFreq) {
            this.latestTime = currentTimeValue;
            return true;
        } else {
            return false;
        }
    }
}

export default TimeAwareSampler;
