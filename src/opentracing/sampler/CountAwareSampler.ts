import Sampler from './Sampler';
import { envVariableKeys } from '../../Constants';
import Utils from '../../plugins/utils/Utils';

const koalas = require('koalas');

class CountAwareSampler implements Sampler<null> {
    countFreq: number;
    counter: number;

    constructor(countFreq?: number) {
        this.countFreq = koalas(parseInt(Utils.getConfiguration(
            envVariableKeys.THUNDRA_AGENT_COUNT_AWARE_SAMPLER_COUNT_FREQ), 10), countFreq, 100);
        this.counter = 0;
    }

    isSampled(): boolean {
        const result = this.counter % this.countFreq === 0;
        this.counter++;
        return result;
    }
}

export default CountAwareSampler;
