class TraceOption {
    private $pattern: string = null;
    private $traceArgs: boolean;
    private $traceReturnValue: boolean;
    private $traceError: boolean;

    constructor(pattern: string) {
        this.$pattern = pattern;
        this.$traceArgs = false;
        this.$traceReturnValue = false;
        this.$traceError = false;
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
}

export default TraceOption;
