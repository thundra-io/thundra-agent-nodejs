import Sampler from './Sampler';
import ConfigProvider from '../../config/ConfigProvider';
import ConfigNames from '../../config/ConfigNames';

const koalas = require('koalas');

/**
 * Time based {@link Sampler} implementation
 * which allows sampling for every specified time period
 */
class TimeAwareSampler implements Sampler<null> {

    private timeFreq: number;
    private latestTime: number;

    constructor(timeFreq?: number) {
        this.timeFreq = ConfigProvider.get<number>(
            ConfigNames.THUNDRA_SAMPLER_TIMEAWARE_TIMEFREQ,
            koalas(timeFreq, undefined)); // if timeFreq is not valid, it passes undefined to get the default value
        this.latestTime = 0;
    }

    /**
     * @inheritDoc
     */
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
