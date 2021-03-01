/**
 * Provides global {@link ExecutionContext}.
 */

import ExecutionContext from './ExecutionContext';

const moduleId = Math.random();
console.log('***** Loading globalContextProvider with module id:', moduleId);
export function runWithContext(createExecContext: Function, fn: Function) {
    global.__thundraGlobalExecutionContext__ = createExecContext();

    const execCtx = global.__thundraGlobalExecutionContext__;
    // @ts-ignore
    console.log('***** <runWithContext> using execution context with id ', execCtx.id, 'module id:', moduleId);

    return fn.call(global.__thundraGlobalExecutionContext__);
}

export function get(): any {
    return global.__thundraGlobalExecutionContext__ || null;
}

export function set(execCtx: ExecutionContext) {
    global.__thundraGlobalExecutionContext__ = execCtx;

    // @ts-ignore
    if (!execCtx.id) {
        // @ts-ignore
        execCtx.id = Math.random();
    }

    // @ts-ignore
    console.log('***** <set context> using execution context with id ', execCtx.id, 'module id:', moduleId);
}

export function init() {
    // noop
}
