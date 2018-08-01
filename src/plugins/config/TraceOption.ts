import {Minimatch, IMinimatch} from 'minimatch';
class TraceOption {
    private $pattern: string = null;
    private $traceArgs: boolean;
    private $traceReturnValue: boolean;
    private $traceError: boolean;
    private $regExpFunction: IMinimatch;
    private $regExpFile: IMinimatch;

    constructor(pattern: string) {
        this.$pattern = pattern;
        this.$traceArgs = false;
        this.$traceReturnValue = false;
        this.$traceError = false;
        this.$regExpFunction = new Minimatch(pattern);
        const split = pattern.split('.');
        this.$regExpFile = new Minimatch(split.slice(0, split.length - 1).join('.') + '.*');
    }

    get pattern(): string {
        return this.$pattern;
    }

    set pattern(pattern: string) {
         this.$pattern = pattern;
    }

    get traceArgs(): boolean {
        return this.$traceArgs;
    }

    set traceArgs(traceArgs: boolean) {
         this.$traceArgs = traceArgs;
    }

    get traceReturnValue(): boolean {
        return this.$traceReturnValue;
    }

    set traceReturnValue(traceReturnValue: boolean) {
         this.$traceReturnValue = traceReturnValue;
    }

    get traceError(): boolean {
        return this.$traceError;
    }

    set traceError(traceError: boolean) {
         this.$traceError = traceError;
    }

    setProperty(key: string, value: any) {
        switch (key) {
            case 'traceArgs':
                this.$traceArgs = (value === 'true');
                break;
            case 'traceReturnValue':
                this.$traceReturnValue = (value === 'true');
                break;
            case 'traceError' :
                this.$traceError = (value === 'true');
                break;
        }
    }

    shouldTraceFunction(traceDef: string): boolean {
        return this.$regExpFunction.match(traceDef);
    }

    shouldTraceFile(traceDef: string): boolean {
        return this.$regExpFile.match(traceDef);
    }

    setPropertyFromConfig(options: any) {
        this.$pattern = options.pattern;
        this.$traceArgs = options.traceArgs;
        this.$traceReturnValue = options.traceReturnValue;
        this.$traceError = options.traceError;
    }
}

export enum TraceOptionCheckLevel {
    FILE,
    FUNCTION,
}

export default TraceOption;
