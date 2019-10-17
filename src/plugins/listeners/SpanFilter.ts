import ThundraSpan from '../../opentracing/Span';

interface SpanFilter {
    accept(span: ThundraSpan): boolean;
}

export default SpanFilter;
