import Sampler from './Sampler';
import { envVariableKeys } from '../../Constants';
import Utils from '../../plugins/utils/Utils';
import ConfigProvider from '../../config/ConfigProvider';
import ConfigNames from '../../config/ConfigNames';

const koalas = require('koalas');

class CountAwareSampler implements Sampler<null> {
    countFreq: number;
    counter: number;

    constructor(countFreq?: number) {
        this.countFreq = koalas(ConfigProvider.get<number>(ConfigNames.THUNDRA_SAMPLER_COUNTAWARE_COUNTFREQ), countFreq, 100);
        this.counter = 0;
    }

    isSampled(): boolean {
        const result = this.counter % this.countFreq === 0;
        this.counter++;
        return result;
    }
}

export default CountAwareSampler;
