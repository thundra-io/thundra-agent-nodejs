import Sampler from './Sampler';
import ThundraSpan from '../opentracing/Span';

/**
 * {@link Sampler} implementation which samples
 * if the span is not root span
 */
class SpanAwareSampler implements Sampler<ThundraSpan> {
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

export default SpanAwareSampler;
