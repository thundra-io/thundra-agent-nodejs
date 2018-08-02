class ReturnValue {
    returnValueType: string;
    returnValue: any;

    constructor(returnValueType: string, returnValue: any) {
        this.returnValueType = returnValueType;
        this.returnValue = returnValue;
    }
}

export default ReturnValue;
