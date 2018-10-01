import ThundraSpan, { SpanEvent } from './Span';
import Stack from './instrument/Stack';

class ThundraRecorder {
    private activeSpan: ThundraSpan;
    private activeSpanStack: Stack<ThundraSpan>;
    private spanList: ThundraSpan[];
    private spanOrder = 1;

    constructor() {
        this.activeSpanStack = new Stack<ThundraSpan>();
        this.spanList = [];
    }

    record(node: ThundraSpan, spanEvent: SpanEvent): void {
        if (spanEvent === SpanEvent.SPAN_START) {
            this.activeSpanStack.push(node);
            this.activeSpan = node;
            node.order = this.spanOrder;
            this.spanOrder++;
        } else if (spanEvent === SpanEvent.SPAN_FINISH) {
            this.spanList.push(this.activeSpanStack.pop());
            this.activeSpan = this.activeSpanStack.peek();
        }
    }

    getSpanList(): ThundraSpan[] {
        return this.spanList;
    }

    getActiveSpan(): ThundraSpan {
        return this.activeSpan;
    }

    destroy() {
        this.activeSpanStack.clear();
        this.spanList = [];
        this.spanOrder = 1;
    }
}

export default ThundraRecorder;
