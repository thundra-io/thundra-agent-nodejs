import TraceDef from '../../plugins/config/TraceDef';

class NodeWrapper {
    node: any;
    instrumentFunction: (traceDef: TraceDef, node: any) => void;

    constructor(node: any, instrumentFunction: (traceDef: TraceDef, node: any) => void) {
        this.node = node;
        this.instrumentFunction = instrumentFunction;
    }
}

export default NodeWrapper;
