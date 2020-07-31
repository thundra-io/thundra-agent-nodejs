import ThundraSpan from '../Span';

interface SpanFilterer {
    accept(span: ThundraSpan): boolean;
}

export default SpanFilterer;
