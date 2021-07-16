import ThundraSpan from '../opentracing/Span';
import Sampler from './Sampler';

/**
 * Base class for {@link ThundraSpan} based {@link Sampler} implementations.
 */
abstract class TraceSampler implements Sampler<ThundraSpan> {

    abstract isSampled(arg?: ThundraSpan): boolean;

    /**
     * Checks whether or not sampling should be applied to each span.
     *
     * @param arg to be used for sampling decision
     * @return {@code true} if sampling should be applied to each span
     *         {@code false} otherwise
     */
    sampleOnEach(): boolean {
        return false;
    }

}

export default TraceSampler;
