import DurationAwareSamplerConfig from './DurationAwareSamplerConfig';
import ErrorAwareSamplerConfig from './ErrorAwareSamplerConfig';
import ThundraSpan from '../../opentracing/Span';
import Sampler from '../../opentracing/sampler/Sampler';
import DurationAwareSampler from '../../opentracing/sampler/DurationAwareSampler';
import ErrorAwareSampler from '../../opentracing/sampler/ErrorAwareSampler';

class TraceSamplerConfig {
    durationAwareSamplerConfig: DurationAwareSamplerConfig;
    errorAwareSamplerConfig: ErrorAwareSamplerConfig;
    customSampler: () => Sampler<ThundraSpan>;

    constructor(options: any) {
        options = options ? options : {};
        this.durationAwareSamplerConfig = new DurationAwareSamplerConfig(options.durationAwareSamplerConfig);
        this.errorAwareSamplerConfig = new ErrorAwareSamplerConfig(options.errorAwareSamplerConfig);
        this.customSampler = options.customSampler;
    }

    isSampled(span: ThundraSpan): boolean {
        let isSampled = true;

        if (this.durationAwareSamplerConfig.enabled) {
            isSampled = new DurationAwareSampler(this.durationAwareSamplerConfig.duration,
                this.durationAwareSamplerConfig.longerThan).isSampled(span);
        }

        if (this.errorAwareSamplerConfig.enabled) {
            isSampled = new ErrorAwareSampler().isSampled(span);
        }

        if (this.customSampler) {
            if (typeof this.customSampler === 'function' && this.customSampler().isSampled) {
                isSampled = this.customSampler().isSampled();
            }
        }

        return isSampled;
    }
}

export default TraceSamplerConfig;
