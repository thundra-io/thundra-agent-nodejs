/**
 * Represents argument with its name, type and actual value in a method call
 */
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
