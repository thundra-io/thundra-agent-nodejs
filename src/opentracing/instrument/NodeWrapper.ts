import TraceableConfig from '../../plugins/config/TraceableConfig';

class NodeWrapper {
    node: any;
    instrumentFunction: (traceableConfig: TraceableConfig, node: any) => void;

    constructor(node: any, instrumentFunction: (traceableConfig: TraceableConfig, node: any) => void) {
        this.node = node;
        this.instrumentFunction = instrumentFunction;
    }
}

export default NodeWrapper;
