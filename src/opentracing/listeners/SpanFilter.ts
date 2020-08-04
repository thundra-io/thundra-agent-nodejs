import ThundraSpan from '../Span';

/**
 * Decides whether {@link ThundraSpan} should be filtered
 */
interface SpanFilter {

    /**
     * Decides whether the given {@link ThundraSpan} should be filtered
     * @param {ThundraSpan} span the {@link ThundraSpan} to be decided whether it should filtered or not
     * @return {@code true} if the {@link ThundraSpan} should filtered, {@code false} otherwise
     */
    accept(span: ThundraSpan): boolean;

}

export default SpanFilter;
