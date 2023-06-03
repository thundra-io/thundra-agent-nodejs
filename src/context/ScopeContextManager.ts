import ScopeContext from './ScopeContext';

const asyncHooks = require('async_hooks');
const semver = require('semver');

const hasKeepAliveBug = !semver.satisfies(process.version, '^8.13 || >=10.14.2');

const contexts: {[key: number]: ScopeContext} = {};
const weaks = new WeakMap();

function destroyAsync(asyncId: number) {
    delete contexts[asyncId];
}

function initAsync(asyncId: number, type: string, triggerAsyncId: number, resource: any) {
    let parentContext: ScopeContext;

    if (contexts[triggerAsyncId]) {
        parentContext = contexts[triggerAsyncId];
    } else if (contexts[asyncHooks.executionAsyncId()]) {
        parentContext = contexts[asyncHooks.executionAsyncId()];
    }

    contexts[asyncId] = new ScopeContext({ parent: parentContext });

    if (hasKeepAliveBug && (type === 'HTTPPARSER' || type === 'TCPPARSER')) {
        destroyAsync(weaks.get(resource));
        weaks.set(resource, asyncId);
    }
}

function init() {
    const hook = asyncHooks.createHook({
        init: initAsync,
        destroy: destroyAsync,
        promiseResolve: destroyAsync,
    });
    hook.enable();
}

/**
 * Manages {@link ScopeContext} and
 * contract point to the outside for {@link ScopeContext} related operation.
 */
export default class ScopeContextManager {

    /**
     * Initializes {@link ScopeContextManager}
     */
    static init() {
        init();
    }

    /**
     * Gets the curremt {@link ScopeContext}
     * @return {ScopeContext} the current {@link ScopeContext}
     */
    static get(): ScopeContext {
        return contexts[asyncHooks.executionAsyncId()] || null;
    }

}
