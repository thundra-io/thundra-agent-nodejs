import ThundraSpan from '../Span';

interface SpanFilter {
    accept(span: ThundraSpan): boolean;
}

export default SpanFilter;
