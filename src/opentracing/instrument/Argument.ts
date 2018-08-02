class Argument {
    argName: string;
    argType: string;
    argValue: any;

    constructor(argName: string, argType: string, argValue: any) {
        this.argName = argName;
        this.argType = argType;
        this.argValue = argValue;
    }
}

export default Argument;
