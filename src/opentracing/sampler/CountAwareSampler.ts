import Sampler from './Sampler';
import Utils from '../../plugins/Utils';
import { envVariableKeys } from '../../Constants';

const koalas = require('koalas');

class CountAwareSampler implements Sampler<null> {
    countFreq: number;
    counter: number;

    constructor(countFreq: number) {
        this.countFreq = koalas(parseInt(Utils.getConfiguration(
            envVariableKeys.THUNDRA_AGENT_METRIC_COUNT_AWARE_SAMPLER_COUNT_FREQ), 10),
                countFreq, 100);
        this.counter = 0;
    }

    isSampled(): boolean {
        this.counter++;
        return this.counter % this.countFreq === 0;
    }
}

export default CountAwareSampler;
