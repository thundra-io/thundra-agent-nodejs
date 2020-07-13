const asyncHooks = require('async_hooks');

const contexts: any = {};

function destroyAsync(asyncId: number) {
    delete contexts[asyncId];
}

function initAsync(asyncId: number, type: string, parentAsyncId: number, resource: string) {
    if (contexts[parentAsyncId]) {
        contexts[asyncId] = contexts[parentAsyncId];
    } else if (contexts[asyncHooks.executionAsyncId()]) {
        contexts[asyncId] = contexts[asyncHooks.executionAsyncId()];
    }
}

export function runWithContext(createExecContext: Function, fn: Function) {
    const execContext = createExecContext();
    if (execContext != null) {
        contexts[asyncHooks.executionAsyncId()] = execContext;
    }

    return fn();
}

export function get(): any {
    return contexts[asyncHooks.executionAsyncId()] || null;
}

export function init() {
    const hook = asyncHooks.createHook({
        init: initAsync,
        destroy: destroyAsync,
        promiseResolve: destroyAsync,
    });
    hook.enable();
}
