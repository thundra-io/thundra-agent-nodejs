import ThundraSpan from '../Span';

/**
 * Applies {@link SpanFilter}s to {@link ThundraSpan} to decided whether it should be filtered
 */
interface SpanFilterer {

    /**
     * Decides whether the given {@link ThundraSpan} should be filtered
     * @param {ThundraSpan} span the {@link ThundraSpan} to be decided whether it should filtered or not
     * @return {@code true} if the {@link ThundraSpan} should filtered, {@code false} otherwise
     */
    accept(span: ThundraSpan): boolean;

}

export default SpanFilterer;
