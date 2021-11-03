/**
 * Provides {@link ExecutionContext} based on Node.js runtime's {@link asyncHooks} support
 * by linking parent and child contexts.
 */

import ExecutionContext from '../../../context/ExecutionContext';

import { ApplicationManager } from '../../../application/ApplicationManager';
import { ContextMode } from '../../../Constants';

const asyncHooks = require('async_hooks');
const semver = require('semver');

const hasKeepAliveBug = !semver.satisfies(process.version, '^8.13 || >=10.14.2');

const contexts: {[key: number]: ExecutionContext} = {};
const weaks = new WeakMap();

let currentContextModel = ContextMode.GlobalMode;

let activeGlobalExecutionContext: ExecutionContext;

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

function _setContext(execContext: ExecutionContext) {
    if (execContext.isContextCompatibleWith(ContextMode.AsyncMode)) {

        currentContextModel = ContextMode.AsyncMode;
        contexts[asyncHooks.executionAsyncId()] = execContext;
    } else {

        activeGlobalExecutionContext = execContext;
        currentContextModel = ContextMode.GlobalMode;
    }

    const {
        applicationClassName,
        applicationDomainName,
        applicationName,
        applicationId,
    } = execContext.getContextInformation();

    ApplicationManager.getApplicationInfoProvider().update({
        ...(applicationClassName ? { applicationClassName } : undefined),
        ...(applicationDomainName ? { applicationDomainName } : undefined),
        ...(applicationName ? { applicationName } : undefined),
        ...(applicationId ? { applicationId } : undefined),
    });
}

export const PROVIDER_NAME = 'Foresight Context Provider';

export function canChangeablebleContext() {
    return false;
}

export function runWithContext(createExecContext: Function, fn: Function) {
    const execContext: ExecutionContext = createExecContext();

    if (activeGlobalExecutionContext != null
        && execContext.isContextCompatibleWith(ContextMode.AsyncMode)) {
        execContext.parentContext = activeGlobalExecutionContext;
    }

    _setContext(execContext);

    return fn.call(execContext);
}

export function get(): any {
    let context;

    if (currentContextModel === ContextMode.GlobalMode) {
        context = activeGlobalExecutionContext;
    } else {
        context = contexts[asyncHooks.executionAsyncId()] || null;
    }

    return context;
}

export function set(execContext: ExecutionContext) {
    _setContext(execContext);
}

export function init() {
    const hook = asyncHooks.createHook({
        init: initAsync,
        destroy: destroyAsync,
        promiseResolve: destroyAsync,
    });

    hook.enable();
}
