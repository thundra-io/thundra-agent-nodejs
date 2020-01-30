import BasePluginConfig from './BasePluginConfig';
import Sampler from '../../opentracing/sampler/Sampler';
import CountAwareSampler from '../../opentracing/sampler/CountAwareSampler';
import TimeAwareSampler from '../../opentracing/sampler/TimeAwareSampler';
import CompositeSampler from '../../opentracing/sampler/CompositeSampler';
import ThundraTracer from '../../opentracing/Tracer';
const get = require('lodash.get');

class MetricConfig extends BasePluginConfig {
    sampler: Sampler<any>;
    tracer: ThundraTracer;

    constructor(options: any) {
        options = options ? options : {};
        super(get(options, 'enabled', true));

        const countAwareSampler = new CountAwareSampler();
        const timeAwareSampler = new TimeAwareSampler();

        const samplers = new Array<Sampler<any>>();
        samplers.push(countAwareSampler);
        samplers.push(timeAwareSampler);

        this.sampler = options.sampler ? options.sampler : new CompositeSampler(samplers);
    }

    updateConfig(options: any) {
        this.sampler = get(options, 'metricConfig.sampler', this.sampler);
        this.enabled = get(options, 'metricConfig.enabled', this.enabled);
    }
}

export default MetricConfig;
