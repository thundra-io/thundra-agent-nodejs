import ThundraSpan from '../../opentracing/Span';

interface ThundraSpanListener {
    onSpanStarted: (span: ThundraSpan, me?: any, callback?: () => any,
                    args?: any[], callbackAlreadyCalled?: boolean) => boolean;
    onSpanFinished: (span: ThundraSpan, me?: any, callback?: () => any,
                     args?: any[], callbackAlreadyCalled?: boolean) => boolean;
    failOnError: () => boolean;
}

export default ThundraSpanListener;
