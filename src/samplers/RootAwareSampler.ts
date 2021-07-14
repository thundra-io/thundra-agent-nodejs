import Sampler from './Sampler';
import ThundraSpan from '../opentracing/Span';

/**
 * {@link Sampler} implementation which samples
 * if the span is the root span
 */
class RootAwareSampler implements Sampler<ThundraSpan> {
    /**
     * @inheritDoc
     */
    isSampled(span: ThundraSpan): boolean {
        if (span.isRootSpan) {
            return true;
        }
        return false;
    }
}

export default RootAwareSampler;
