/**
 * Provides global {@link ExecutionContext}.
 */

import ExecutionContext from './ExecutionContext';

console.log('***** Loading globalContextProvider with pid ' + process.pid);

// @ts-ignore
console.log('***** Loading globalContextProvider with global id:', global.id);

// @ts-ignore
if (!global.id) {
    console.log('***** Loading globalContextProvider by setting global id');
    // @ts-ignore
    global.id = Math.random();
}

// @ts-ignore
console.log('***** Loading globalContextProvider with global id:', global.id);

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
    const execCtx = global.__thundraGlobalExecutionContext__ || null;

    if (execCtx) {
        // @ts-ignore
        console.log('***** <get context> using execution context with id ', execCtx.id, 'module id:', moduleId);
    }

    return execCtx;
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
