import CountAwareSamplerConfig from './CountAwareSamplerConfig';
import TimeAwareSamplerConfig from './TimeAwareSamplerConfig';
import Sampler from '../../opentracing/sampler/Sampler';
import CountAwareSampler from '../../opentracing/sampler/CountAwareSampler';
import TimeAwareSampler from '../../opentracing/sampler/TimeAwareSampler';

class MetricSamplerConfig {
    countAwareSamplerConfig: CountAwareSamplerConfig;
    timeAwareSamplerConfig: TimeAwareSamplerConfig;
    customSampler: () => Sampler<null>;
    countAwareSampler: CountAwareSampler;
    timeAwareSampler: TimeAwareSampler;

    constructor(options: any) {
        options = options ? options : {};
        this.countAwareSamplerConfig = new CountAwareSamplerConfig(options.countAwareSamplerConfig);
        this.timeAwareSamplerConfig = new TimeAwareSamplerConfig(options.timeAwareSamplerConfig);
        this.customSampler = options.customSampler;

        if (this.countAwareSamplerConfig.enabled) {
            this.countAwareSampler = new CountAwareSampler(this.countAwareSamplerConfig.countFreq);
        }

        if (this.timeAwareSamplerConfig.enabled) {
            this.timeAwareSampler = new TimeAwareSampler(this.timeAwareSamplerConfig.timeFreq);
        }
    }

    isSampled(): boolean {
        let isSampled = true;

        if (this.countAwareSampler) {
            isSampled = this.countAwareSampler.isSampled();
        }

        if (this.timeAwareSampler) {
            isSampled = this.timeAwareSampler.isSampled();
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
