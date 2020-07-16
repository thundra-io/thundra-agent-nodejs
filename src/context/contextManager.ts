import ExecutionContext from './ExecutionContext';

let contextProvider = require('./globalContextProvider');

export function runWithContext(createExecContext: Function, fn: Function) {
    return contextProvider.runWithContext(createExecContext, fn);
}

export function get(): ExecutionContext {
    return contextProvider.get();
}

export function init() {
    contextProvider.init();
}

export function setProvider(provider: any) {
    contextProvider = provider;
}
