import ThundraSpan from '../../opentracing/Span';

interface ThundraSpanListener {

    /**
     * Called when {@link ThundraSpan span} has started.
     *
     * @param span the started {@link ThundraSpan span}
     */
    onSpanStarted: (span: ThundraSpan) => void;

    /**
     * Called when {@link ThundraSpan span} has finished.
     *
     * @param span the finished {@link ThundraSpan span}
     */
    onSpanFinished: (span: ThundraSpan) => void;
}

export default ThundraSpanListener;
