import TraceOption from '../../plugins/config/TraceOption';

class NodeWrapper {
    node: any;
    instrumentFunction: (traceOption: TraceOption, node: any) => void;

    constructor(node: any, instrumentFunction: (traceOption: TraceOption, node: any) => void) {
        this.node = node;
        this.instrumentFunction = instrumentFunction;
    }
}

export default NodeWrapper;
