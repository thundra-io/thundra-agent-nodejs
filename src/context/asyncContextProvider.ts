/**
 * Provides {@link ExecutionContext} based on Node.js runtime's {@link asyncHooks} support
 * by linking parent and child contexts.
 */

import ExecutionContext from './ExecutionContext';

const asyncHooks = require('async_hooks');
const semver = require('semver');

const hasKeepAliveBug = !semver.satisfies(process.version, '^8.13 || >=10.14.2');

const contexts: {[key: number]: ExecutionContext} = {};
const weaks = new WeakMap();

function destroyAsync(asyncId: number) {
    delete contexts[asyncId];
}

function initAsync(asyncId: number, type: string, triggerAsyncId: number, resource: any) {
    if (contexts[triggerAsyncId]) {
        contexts[asyncId] = contexts[triggerAsyncId];
    } else if (contexts[asyncHooks.executionAsyncId()]) {
        contexts[asyncId] = contexts[asyncHooks.executionAsyncId()];
    }

    if (hasKeepAliveBug && (type === 'HTTPPARSER' || type === 'TCPPARSER')) {
        destroyAsync(weaks.get(resource));
        weaks.set(resource, asyncId);
    }
}

export const PROVIDER_NAME = 'Async Context Provider';

export function canChangeableContext() {
    return true;
}

export function runWithContext(createExecContext: Function, fn: Function) {
    const execContext = createExecContext();
    if (execContext != null) {
        contexts[asyncHooks.executionAsyncId()] = execContext;
    }

    return fn.call(execContext);
}

export function get(): any {
    return contexts[asyncHooks.executionAsyncId()] || null;
}

export function set(execCtx: ExecutionContext) {
    contexts[asyncHooks.executionAsyncId()] = execCtx;
}

export function init() {
    const hook = asyncHooks.createHook({
        init: initAsync,
        destroy: destroyAsync,
        promiseResolve: destroyAsync,
    });
    hook.enable();
}
