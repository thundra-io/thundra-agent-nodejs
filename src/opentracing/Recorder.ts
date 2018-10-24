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

    record(node: ThundraSpan, spanEvent: SpanEvent): void {
        if (!node) {
            ThundraLogger.getInstance().error('Undefined span.');
        } else if (spanEvent === SpanEvent.SPAN_START) {
            ThundraLogger.getInstance().debug(`Span with name ${node.operationName} started.`);
            this.activeSpanStack.push(node);
            node.order = this.spanOrder;
            this.spanOrder++;
        } else if (spanEvent === SpanEvent.SPAN_FINISH) {
            ThundraLogger.getInstance().debug(`Span with name ${node.operationName} finished.`);
            const span = this.activeSpanStack.pop();
            this.spanList.push(span);
        }
    }

    getSpanList(): ThundraSpan[] {
        return this.spanList;
    }

    getActiveSpan(): ThundraSpan {
        return this.activeSpanStack.peek();
    }

    getActiveSpanStack(): Stack<ThundraSpan> {
        return this.activeSpanStack;
    }

    destroy() {
        this.activeSpanStack.clear();
        this.spanList = [];
        this.spanOrder = 1;
    }
}

export default ThundraRecorder;
