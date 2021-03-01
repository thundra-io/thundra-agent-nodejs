/**
 * Provides global {@link ExecutionContext}.
 */

import ExecutionContext from './ExecutionContext';

let globalContext: ExecutionContext;
const moduleId = Math.random();

export function runWithContext(createExecContext: Function, fn: Function) {
    globalContext = createExecContext();

    // @ts-ignore
    console.log('***** <runWithContext> using execution context with id ', globalContext.id, 'module id:', moduleId);

    return fn.call(globalContext);
}

export function get(): any {
    return globalContext || null;
}

export function set(execCtx: ExecutionContext) {
    globalContext = execCtx;

    // @ts-ignore
    if (!globalContext.id) {
        // @ts-ignore
        globalContext.id = Math.random();
    }

    // @ts-ignore
    console.log('***** <set context> using execution context with id ', globalContext.id, 'module id:', moduleId);
}

export function init() {
    // noop
}
