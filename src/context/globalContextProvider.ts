/**
 * Provides global {@link ExecutionContext}.
 */

import ExecutionContext from './ExecutionContext';

let globalContext: ExecutionContext;

export const PROVIDER_NAME = 'Global Context Provider';

export function canChangeablebleContext() {
    return true;
}

export function runWithContext(createExecContext: Function, fn: Function) {
    globalContext = createExecContext();

    return fn.call(globalContext);
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
