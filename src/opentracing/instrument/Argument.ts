class Argument {
    name: string;
    type: string;
    value: any;

    constructor(name: string, type: string, value: any) {
        this.name = name;
        this.type = type;
        this.value = value;
    }
}

export default Argument;
