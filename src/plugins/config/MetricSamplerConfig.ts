import CountAwareSamplerConfig from './CountAwareSamplerConfig';
import TimeAwareSamplerConfig from './TimeAwareSamplerConfig';
import Sampler from '../../opentracing/sampler/Sampler';
import CountAwareSampler from '../../opentracing/sampler/CountAwareSampler';
import TimeAwareSampler from '../../opentracing/sampler/TimeAwareSampler';

class MetricSamplerConfig {
    countAwareSamplerConfig: CountAwareSamplerConfig;
    timeAwareSamplerConfig: TimeAwareSamplerConfig;
    customSampler: () => Sampler<null>;

    constructor(options: any) {
        options = options ? options : {};
        this.countAwareSamplerConfig = new CountAwareSamplerConfig(options.countAwareSamplerConfig);
        this.timeAwareSamplerConfig = new TimeAwareSamplerConfig(options.timeAwareSamplerConfig);
        this.customSampler = options.customSampler;
    }

    isSampled(): boolean {
        let isSampled = true;

        if (this.countAwareSamplerConfig.enabled) {
            isSampled = new CountAwareSampler(this.countAwareSamplerConfig.countFreq).isSampled();
        }

        if (this.timeAwareSamplerConfig.enabled) {
            isSampled = new TimeAwareSampler(this.timeAwareSamplerConfig.timeFreq).isSampled();
        }

        if (this.customSampler) {
            if (typeof this.customSampler === 'function' && this.customSampler().isSampled) {
                isSampled = this.customSampler().isSampled();
            }
        }

        return isSampled;
    }

}

export default MetricSamplerConfig;
