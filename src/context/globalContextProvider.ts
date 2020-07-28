import ExecutionContext from './ExecutionContext';

let globalContext: ExecutionContext;

export function runWithContext(createExecContext: Function, fn: Function) {
    globalContext = createExecContext();

    return fn();
}

export function get(): any {
    return globalContext || null;
}

export function set(execCtx: ExecutionContext) {
    globalContext = execCtx;
}

export function init() {
    // noop
}
