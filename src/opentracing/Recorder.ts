import ThundraSpan, { SpanEvent } from './Span';
import Stack from './instrument/Stack';
import ThundraLogger from '../ThundraLogger';

class ThundraRecorder {
    private activeSpanStack: Stack<ThundraSpan>;
    private spanList: ThundraSpan[];
    private spanOrder = 1;

    constructor() {
        this.activeSpanStack = new Stack<ThundraSpan>();
        this.spanList = [];
    }

    record(span: ThundraSpan, spanEvent: SpanEvent, options?: any): void {
        if (!span) {
            ThundraLogger.getInstance().error('Undefined span.');
        } else {
            if (spanEvent === SpanEvent.SPAN_START) {
                ThundraLogger.getInstance().debug(`Span with name ${span.operationName} started.`);
                if (!(options && options.disableActiveSpanHandling === true)) {
                    this.activeSpanStack.push(span);
                }
                span.order = this.spanOrder++;
            } else if (spanEvent === SpanEvent.SPAN_FINISH) {
                ThundraLogger.getInstance().debug(`Span with name ${span.operationName} finished.`);
                if (!(options && options.disableActiveSpanHandling === true)) {
                    this.activeSpanStack.pop();
                }
                this.spanList.push(span);
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
}

export default ThundraRecorder;
