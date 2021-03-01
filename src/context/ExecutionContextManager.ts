import ExecutionContext from './ExecutionContext';
import * as globalContextProvider from './globalContextProvider';

const moduleId = Math.random();
console.log('***** Loading ExecutionContextManager with module id:', moduleId);

/**
 * Manages {@link ExecutionContext} and
 * contract point to the outside for {@link ExecutionContext} related operation.
 */
export default class ExecutionContextManager {

    private static contextProvider: any = globalContextProvider;

    /**
     * Initializes {@link ExecutionContextManager}
     */
    static init() {
        ExecutionContextManager.contextProvider.init();
    }

    /**
     * Sets the {@link ExecutionContext} provider
     * @param provided the {@link ExecutionContext} provider to be set
     */
    static setProvider(provider: any) {
        ExecutionContextManager.contextProvider = provider;
    }

    /**
     * Sets the {@link ExecutionContext} provider to globalContextProvider
     */
    static useGlobalProvider() {
        ExecutionContextManager.contextProvider = globalContextProvider;
    }

    /**
     * Runs given {@param fn} in the created {@link ExecutionContext}
     * by given {@param createExecContext}
     * @param {Function} createExecContext creates {@link ExecutionContext}
     * @param {Function} fn runs in the created {@link ExecutionContext}
     */
    static runWithContext(createExecContext: Function, fn: Function) {
        return ExecutionContextManager.contextProvider.runWithContext(createExecContext, fn);
    }

    /**
     * Gets the {@link ExecutionContext}
     * @return {ExecutionContext} the {@link ExecutionContext}
     */
    static get(): ExecutionContext {
        const execContext: ExecutionContext = ExecutionContextManager.contextProvider.get();
        if (execContext) {
            return execContext;
        } else {
            return {} as ExecutionContext;
        }
    }

    /**
     * Sets the {@link ExecutionContext}
     * @param {ExecutionContext} execCtx {@link ExecutionContext} to be set
     */
    static set(execCtx: ExecutionContext) {
        return ExecutionContextManager.contextProvider.set(execCtx);
    }

}
