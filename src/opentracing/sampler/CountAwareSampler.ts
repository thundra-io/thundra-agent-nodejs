import Sampler from './Sampler';
import { envVariableKeys } from '../../Constants';
import Utils from '../../plugins/utils/Utils';

class CountAwareSampler implements Sampler<null> {
    countFreq: number;
    counter: number;

    constructor(countFreq?: number) {
        this.countFreq = Utils.getNumericConfiguration(envVariableKeys.THUNDRA_AGENT_COUNT_AWARE_SAMPLER_COUNT_FREQ)
            || countFreq
            || 100;
        this.counter = 0;
    }

    isSampled(): boolean {
        const result = this.counter % this.countFreq === 0;
        this.counter++;
        return result;
    }
}

export default CountAwareSampler;
