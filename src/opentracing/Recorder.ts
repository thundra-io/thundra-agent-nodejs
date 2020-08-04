import ThundraSpan, { SpanEvent } from './Span';
import Stack from './utils/Stack';
import ThundraLogger from '../ThundraLogger';
import ThundraSpanListener from './listeners/ThundraSpanListener';

/**
 * Records/holds created/started {@link ThundraSpan}s by {@link ThundraTracer}.
 */
class ThundraRecorder {

    private activeSpanStack: Stack<ThundraSpan>;
    private spanList: ThundraSpan[];
    private spanOrder = 1;
    private listeners: ThundraSpanListener[] = [];

    constructor() {
        this.activeSpanStack = new Stack<ThundraSpan>();
        this.spanList = [];
    }

    /**
     * Records the given {@link ThundraSpan}
     * @param span the {@link ThundraSpan} to be recorded
     * @param spanEvent the {@link SpanEvent}
     * @param options the options to be used for recording
     */
    record(span: ThundraSpan, spanEvent: SpanEvent, options?: any): void {
        options = options ? options : {};
        if (!span) {
            ThundraLogger.error('Undefined span.');
            return;
        }

        let shouldInvokeCallback = true;

        if (spanEvent === SpanEvent.SPAN_START) {
            ThundraLogger.debug(`Span with name ${span.operationName} started.`);
            if (!(options && options.disableActiveSpanHandling === true)) {
                this.activeSpanStack.push(span);
            }
            span.order = this.spanOrder++;
            this.spanList.push(span);

            for (const listener of this.listeners) {
                const isCallbackCalled = listener.onSpanStarted(span, options.me,
                    options.callback, options.args, !shouldInvokeCallback);
                if (shouldInvokeCallback) {
                    shouldInvokeCallback = !isCallbackCalled;
                }
            }
            if (shouldInvokeCallback && typeof(options.callback) === 'function') {
                options.callback.apply(options.me, options.args);
            }
        } else if (spanEvent === SpanEvent.SPAN_INITIALIZE) {
            ThundraLogger.debug(`Span with name ${span.operationName} initialized.`);

            for (const listener of this.listeners) {
                const isCallbackCalled = listener.onSpanInitialized(span, options.me,
                    options.callback, options.args, !shouldInvokeCallback);
                if (shouldInvokeCallback) {
                    shouldInvokeCallback = !isCallbackCalled;
                }
            }
            if (shouldInvokeCallback) {
                if (typeof(options.callback) === 'function') {
                    options.callback.apply(options.me, options.args);
                }
            }
        } else if (spanEvent === SpanEvent.SPAN_FINISH) {
            ThundraLogger.debug(`Span with name ${span.operationName} finished.`);
            if (!(options && options.disableActiveSpanHandling === true)) {
                this.activeSpanStack.pop();
            }

            for (const listener of this.listeners) {
                const isCallbackCalled = listener.onSpanFinished(span, options.me,
                    options.callback, options.args, !shouldInvokeCallback);
                if (shouldInvokeCallback) {
                    shouldInvokeCallback = !isCallbackCalled;
                }
            }
            if (shouldInvokeCallback) {
                if (typeof(options.callback) === 'function') {
                    options.callback.apply(options.me, options.args);
                }
            }
        }
    }

    /**
     * Gets the recorded {@link ThundraSpan}s
     * @record {ThundraSpan[]} the recorded {@link ThundraSpan}s
     */
    getSpanList(): ThundraSpan[] {
        return this.spanList;
    }

    /**
     * Gets the active {@link ThundraSpan}
     * @return {ThundraSpan} the active {@link ThundraSpan}
     */
    getActiveSpan(): ThundraSpan {
        return this.activeSpanStack.peek();
    }

    /**
     * Sets the active {@link ThundraSpan}
     * @param span the active {@link ThundraSpan} to be set
     */
    setActiveSpan(span: ThundraSpan) {
        this.activeSpanStack.push(span);
    }

    /**
     * Removes the active {@link ThundraSpan}
     * @return {ThundraSpan} the removed active {@link ThundraSpan}
     */
    removeActiveSpan(): ThundraSpan {
        return this.activeSpanStack.pop();
    }

    /**
     * Adds/registers the given {@link ThundraSpanListener}
     * @param {ThundraSpanListener} listener the {@link ThundraSpanListener} to be added/registered
     */
    addSpanListener(listener: ThundraSpanListener) {
        this.listeners.push(listener);
    }

    /**
     * Sets/registers the given {@link ThundraSpanListener}s
     * @param {ThundraSpanListener[]} listeners the {@link ThundraSpanListener}s to be added/registered
     */
    setSpanListeners(listeners: ThundraSpanListener[]) {
        this.listeners = listeners;
    }

    /**
     * Destroys recorder
     */
    destroy() {
        this.activeSpanStack.clear();
        this.spanList = [];
        this.spanOrder = 1;
    }

}

export default ThundraRecorder;
