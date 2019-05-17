import BasePluginConfig from './BasePluginConfig';
import Utils from '../utils/Utils';
import { envVariableKeys } from '../../Constants';
const koalas = require('koalas');

class CountAwareSamplerConfig extends BasePluginConfig {
    countFreq: number;

    constructor(options: any) {
        options = options ? options : {};
        super(koalas(options.enabled, false));

        const freq = koalas(options.countFreq, 100);
        this.countFreq = parseInt(freq, 10);
    }
}

export default CountAwareSamplerConfig;
