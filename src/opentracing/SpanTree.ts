import ThundraSpan from './Span';

class SpanTreeNode {
    value: ThundraSpan;
    parent: SpanTreeNode;
    children: SpanTreeNode[] = new Array<SpanTreeNode>();

    constructor(span: ThundraSpan) {
        this.value = span;
    }
}

export default SpanTreeNode;
