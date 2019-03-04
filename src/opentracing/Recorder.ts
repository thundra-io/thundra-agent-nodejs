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
            ThundraLogger.getInstance().error('Undefined span.');
            return;
        }

        if (spanEvent === SpanEvent.SPAN_START) {
            ThundraLogger.getInstance().debug(`Span with name ${span.operationName} started.`);
            if (!(options && options.disableActiveSpanHandling === true)) {
                this.activeSpanStack.push(span);
            }
            span.order = this.spanOrder++;
            this.spanList.push(span);

            let shouldInvokeCallback = true;
            for (const listener of this.listeners) {
                const isCallbackCalled = listener.onSpanStarted(span, options.me, options.callback, options.args);
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
            ThundraLogger.getInstance().debug(`Span with name ${span.operationName} finished.`);
            if (!(options && options.disableActiveSpanHandling === true)) {
                this.activeSpanStack.pop();
            }

            let shouldInvokeCallback = true;
            for (const listener of this.listeners) {
                const isCallbackCalled = listener.onSpanFinished(span, options.me, options.callback, options.args);
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
        this.listeners = [];
    }

    addSpanListener(listener: ThundraSpanListener) {
        this.listeners.push(listener);
    }
}

export default ThundraRecorder;
