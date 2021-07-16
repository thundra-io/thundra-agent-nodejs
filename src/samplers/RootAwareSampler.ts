import TraceSampler from './TraceSampler';
import ThundraSpan from '../opentracing/Span';

/**
 * {@link Sampler} implementation which samples
 * if the span is the root span
 */
class RootAwareSampler extends TraceSampler {

    /**
     * @inheritDoc
     */
    isSampled(span: ThundraSpan): boolean {
        if (span.isRootSpan) {
            return true;
        }
        return false;
    }

    /**
     * @inheritDoc
     */
    sampleOnEach(): boolean {
        return true;
    }

}

export default RootAwareSampler;
