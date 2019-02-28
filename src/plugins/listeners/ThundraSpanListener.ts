import ThundraSpan from '../../opentracing/Span';

interface ThundraSpanListener {
    onSpanStarted: (span: ThundraSpan, me?: any, callback?: () => any, args?: any []) => boolean;
    onSpanFinished: (span: ThundraSpan, me?: any, callback?: () => any, args?: any []) => boolean;
    failOnError: () => boolean;
}

export default ThundraSpanListener;
