import ThundraSpan from '../../opentracing/Span';

interface SpanFilterer {
    accept(span: ThundraSpan): boolean;
}

export default SpanFilterer;
