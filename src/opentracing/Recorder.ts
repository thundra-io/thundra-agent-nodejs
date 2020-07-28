import ThundraSpan, { SpanEvent } from './Span';
import Stack from './instrument/Stack';
import ThundraLogger from '../ThundraLogger';
import ThundraSpanListener from '../plugins/listeners/ThundraSpanListener';

class ThundraRecorder {
    private activeSpanStack: Stack<ThundraSpan>;
    private spanList: ThundraSpan[];
    private spanOrder = 1;
    private listeners: ThundraSpanListener[] = [];

    constructor() {
        this.activeSpanStack = new Stack<ThundraSpan>();
        this.spanList = [];
    }

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

    getSpanList(): ThundraSpan[] {
        return this.spanList;
    }

    getActiveSpan(): ThundraSpan {
        return this.activeSpanStack.peek();
    }

    setActiveSpan(span: ThundraSpan) {
        this.activeSpanStack.push(span);
    }

    removeActiveSpan(): ThundraSpan {
        return this.activeSpanStack.pop();
    }

    destroy() {
        this.activeSpanStack.clear();
        this.spanList = [];
        this.spanOrder = 1;
    }

    addSpanListener(listener: ThundraSpanListener) {
        this.listeners.push(listener);
    }

    setSpanListeners(listeners: ThundraSpanListener[]) {
        this.listeners = listeners;
    }
}

export default ThundraRecorder;
