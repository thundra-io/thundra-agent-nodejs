/**
 * Represents return value with its type and actual value of a method call
 */
class ReturnValue {

    type: string;
    value: any;

    constructor(type: string, value: any) {
        this.type = type;
        this.value = value;
    }

}

export default ReturnValue;
