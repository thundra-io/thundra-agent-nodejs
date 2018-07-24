import ThundraSpan from './Span';

class SpanTreeNode {
    value: ThundraSpan;
    parent: SpanTreeNode;
    thrownError: string;
    errors: [any];
    children: SpanTreeNode[] = new Array<SpanTreeNode>();

    constructor(span: ThundraSpan) {
        this.value = span;
    }
}

export default SpanTreeNode;
