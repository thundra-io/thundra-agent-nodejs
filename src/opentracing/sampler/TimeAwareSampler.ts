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
        this.timeFreq = koalas(ConfigProvider.get<number>(ConfigNames.THUNDRA_SAMPLER_TIMEAWARE_TIMEFREQ), timeFreq, 300000);
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
