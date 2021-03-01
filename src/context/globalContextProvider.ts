/**
 * Provides global {@link ExecutionContext}.
 */

import ExecutionContext from './ExecutionContext';

let globalContext: ExecutionContext;

export function runWithContext(createExecContext: Function, fn: Function) {
    globalContext = createExecContext();
    // @ts-ignore
    console.log('***** <runWithContext> using execution context with id ', globalContext.id);

    return fn.call(globalContext);
}

export function get(): any {
    return globalContext || null;
}

export function set(execCtx: ExecutionContext) {
    globalContext = execCtx;

    // @ts-ignore
    console.log('***** <set context> using execution context with id ', globalContext.id);
}

export function init() {
    // noop
}
