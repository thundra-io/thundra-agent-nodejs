import { ClassNames, DomainNames } from '../../Constants';
import Reporter from '../../Reporter';
import ThundraLogger from '../../ThundraLogger';
import * as GenericExecutor from './GenericExecutor';
import WrapperUtils from '../WebWrapperUtils';
import ExecutionContextManager from '../../context/ExecutionContextManager';
import ExecutionContext from '../../context/ExecutionContext';

const ApplicationClassName = ClassNames.NODE_HANDLER;
const ApplicationDomainName = DomainNames.NODE_GENERIC;

let _REPORTER: Reporter;
let _PLUGINS: any[];
let initialized = false;

const initWrapperContext = () => {
    if (initialized) {
        return;
    }

    ThundraLogger.debug('<GenericWrapper> Initializing ...');
    initialized = true;
    const {
        reporter,
        plugins,
    } = WrapperUtils.initWrapper(GenericExecutor);

    _REPORTER = reporter;
    _PLUGINS = plugins;

    WrapperUtils.initAsyncContextManager();
};

const beforeRequest = async ({ name }: any) => {
    try {
        await WrapperUtils.beforeRequest({
            functionName: name,
        },
        {},
        _PLUGINS);
    } catch (error) {
        ThundraLogger.debug('<GenericWrapper> An error occured while handling beforeRequest', error);
    }
};

const afterRequest = async ({ name }: any) => {
    try {
        await WrapperUtils.afterRequest({
            functionName: name,
        },
        {},
        _PLUGINS,
        __PRIVATE__.getReporter());
    } catch (error) {
        ThundraLogger.debug('<GenericWrapper> An error occured while handling afterRequest', error);
    }
};

const wrapperHandler = async (func: Function, ...args: any[]) => ExecutionContextManager.runWithContext(
    () => {
        return WrapperUtils.createExecContext(ApplicationClassName, ApplicationDomainName);
    },
    async function () {
        const context: ExecutionContext = this;
        let beforeRequestCalled: boolean = false;
        let asyncFunction: boolean = false;
        let originalFunction;

        try {
            ThundraLogger.debug('<GenericWrapper> Before handling request');

            await beforeRequest(func);
            beforeRequestCalled = true;

            originalFunction = func(...args);
            if (originalFunction.then) {
                asyncFunction = true;
                originalFunction.then(async (...data: any[]) => {
                    await afterRequest(func);
                }).catch(async (error: Error) => {
                    context.setError(error);
                    await afterRequest(func);

                    throw error;
                });
            }

            return originalFunction;
        } catch (error) {
            ThundraLogger.debug('<GenericWrapper> An error occured while handling trigger', error);
            context.setError(error);

            throw error;
        } finally {
            ThundraLogger.debug('<GenericWrapper> After handling request');
            if (beforeRequestCalled && !asyncFunction) {
                await afterRequest(func);
           }
        }
});

export function wrapper<T extends (...args: any[]) => any>(func: T): T {
    initWrapperContext();
    return (async (...args: any[]) => {
        return wrapperHandler(func, ...args);
    }) as T;
}

export const __PRIVATE__ = {
    getReporter: () => {
        return _REPORTER;
    },
};
