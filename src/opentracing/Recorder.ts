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
                if (this.activeSpan) {
                    this.activeSpan.children.push(node);
                    node.parent = this.activeSpan;
                } else {
                   this.spanTree.children.push(node);
                   node.parent = null;
                }
            }
            this.activeSpan = node;
        } else if (spanEvent === SpanEvent.SPAN_FINISH) {
            this.activeSpan =  this.activeSpan ? this.activeSpan.parent : null;
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
