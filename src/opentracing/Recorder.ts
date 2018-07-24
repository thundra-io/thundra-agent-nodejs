import ThundraSpan, { SpanEvent } from './Span';
import SpanTreeNode from './SpanTree';

class ThundraRecorder {
    private activeSpan: SpanTreeNode;
    private spanTree: SpanTreeNode;

    record(span: ThundraSpan, spanEvent: SpanEvent): void {
        if (spanEvent === SpanEvent.SPAN_START) {
            const node: SpanTreeNode = new SpanTreeNode(span);
            if (!this.spanTree) {
                this.spanTree = node;
            } else {
                this.activeSpan.children.push(node);
                node.parent = this.activeSpan;
            }
            this.activeSpan = node;
        } else if (spanEvent === SpanEvent.SPAN_FINISH) {
            this.activeSpan = this.activeSpan.parent;
        }
    }

    getSpanTree(): SpanTreeNode {
        return this.spanTree;
    }

    getActiveSpan(): SpanTreeNode {
        return this.activeSpan;
    }

    destroy() {
        this.spanTree = null;
        this.activeSpan = null;
    }
}

export default ThundraRecorder;
