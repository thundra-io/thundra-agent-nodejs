import BasePluginConfig from './BasePluginConfig';
import Sampler from '../../opentracing/sampler/Sampler';
import CountAwareSampler from '../../opentracing/sampler/CountAwareSampler';
import TimeAwareSampler from '../../opentracing/sampler/TimeAwareSampler';
import CompositeSampler from '../../opentracing/sampler/CompositeSampler';

const get = require('lodash.get');

/**
 * Configures log plugin/support
 */
class MetricConfig extends BasePluginConfig {

    sampler: Sampler<any>;

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

    /**
     * Updates configuration by options
     * @param options the options to update configuration
     */
    updateConfig(options: any) {
        this.sampler = get(options, 'metricConfig.sampler', this.sampler);
        this.enabled = get(options, 'metricConfig.enabled', this.enabled);
    }

}

export default MetricConfig;
