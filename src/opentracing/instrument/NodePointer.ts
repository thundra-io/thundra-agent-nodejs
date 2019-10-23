export const RETURN_POINTER_TYPE = 1;
export const LINE_POINTER_TYPE = 2;

class NodePointer {

    type: number;
    pointer: string;

    constructor(type: number, pointer: string) {
        this.type = type;
        this.pointer = pointer;
    }

}

export default NodePointer;
