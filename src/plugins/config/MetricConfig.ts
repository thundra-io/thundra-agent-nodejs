import BasePluginConfig from './BasePluginConfig';
import Sampler from '../../opentracing/sampler/Sampler';
import CountAwareSampler from '../../opentracing/sampler/CountAwareSampler';
import TimeAwareSampler from '../../opentracing/sampler/TimeAwareSampler';
import CompositeSampler from '../../opentracing/sampler/CompositeSampler';
const koalas = require('koalas');

class MetricConfig extends BasePluginConfig {
    sampler: Sampler<any>;

    constructor(options: any) {
        options = options ? options : {};
        super(koalas(options.enabled, true));

        const countAwareSampler = new CountAwareSampler();
        const timeAwareSampler = new TimeAwareSampler();

        const samplers = new Array<Sampler<any>>();
        samplers.push(countAwareSampler);
        samplers.push(timeAwareSampler);

        this.sampler = options.sampler ? options.sampler : new CompositeSampler(samplers);
    }
}

export default MetricConfig;
