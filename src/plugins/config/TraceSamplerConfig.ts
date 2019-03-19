import DurationAwareSamplerConfig from './DurationAwareSamplerConfig';
import ErrorAwareSamplerConfig from './ErrorAwareSamplerConfig';
import ThundraSpan from '../../opentracing/Span';
import Sampler from '../../opentracing/sampler/Sampler';
import DurationAwareSampler from '../../opentracing/sampler/DurationAwareSampler';
import ErrorAwareSampler from '../../opentracing/sampler/ErrorAwareSampler';

class TraceSamplerConfig {
    durationAwareSamplerConfig: DurationAwareSamplerConfig;
    errorAwareSamplerConfig: ErrorAwareSamplerConfig;
    durationAwareSampler: DurationAwareSampler;
    errorAwareSampler: ErrorAwareSampler;
    customSampler: Sampler<ThundraSpan>;
    runCustomSamplerOnEachSpan: boolean;

    constructor(options: any) {
        options = options ? options : {};
        this.durationAwareSamplerConfig = new DurationAwareSamplerConfig(options.durationAwareSamplerConfig);
        this.errorAwareSamplerConfig = new ErrorAwareSamplerConfig(options.errorAwareSamplerConfig);
        this.customSampler = options.customSampler;

        if (this.durationAwareSamplerConfig.enabled) {
            this.durationAwareSampler = new DurationAwareSampler(this.durationAwareSamplerConfig.duration,
                this.durationAwareSamplerConfig.longerThan);
        }

        if (this.errorAwareSamplerConfig.enabled) {
            this.errorAwareSampler = new ErrorAwareSampler();
        }

        this.runCustomSamplerOnEachSpan = options.runCustomSamplerOnEachSpan
                                            ? options.runCustomSamplerOnEachSpan : false;
    }

    isSampled(span: ThundraSpan): boolean {
        let isSampled = false;

        if (!this.durationAwareSampler &&
            !this.errorAwareSampler &&
            !this.customSampler) {
                isSampled = true;
        }

        if (this.durationAwareSampler) {
            isSampled = isSampled || this.durationAwareSampler.isSampled(span);
        }

        if (this.errorAwareSampler) {
            isSampled = isSampled || this.errorAwareSampler.isSampled(span);
        }

        if (this.customSampler) {
            if (this.runCustomSamplerOnEachSpan) {
                isSampled = true;
            } else {
                isSampled = isSampled || this.customSampler.isSampled(span);
            }
        }

        return isSampled;
    }
}

export default TraceSamplerConfig;
