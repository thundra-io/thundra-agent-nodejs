import { ClassNames, DomainNames } from '../../Constants';
import Reporter from '../../Reporter';
import ThundraLogger from '../../ThundraLogger';
import * as GenericExecutor from './GenericExecutor';
import WrapperUtils from '../WebWrapperUtils';
import ExecutionContextManager from '../../context/ExecutionContextManager';
import ExecutionContext from '../../context/ExecutionContext';
import Utils from '../../utils/Utils';

const ApplicationClassName = ClassNames.NODE_HANDLER;
const ApplicationDomainName = DomainNames.NODE_GENERIC;

let _REPORTER: Reporter;
let _PLUGINS: any[];
let initialized: boolean = false;

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

const beforeRequest = async ({ name, __THUNDRA_ID__ }: any) => {
    try {
        await WrapperUtils.beforeRequest({
            functionName: name,
            __THUNDRA_ID__,
        },
        {},
        _PLUGINS);
    } catch (error) {
        ThundraLogger.debug('<GenericWrapper> An error occured while handling beforeRequest', error);
    }
};

const afterRequest = async ({ name, __THUNDRA_ID__ }: any) => {
    try {
        await WrapperUtils.afterRequest({
            functionName: name,
            __THUNDRA_ID__,
        },
        {},
        _PLUGINS,
        __PRIVATE__.getReporter());
    } catch (error) {
        ThundraLogger.debug('<GenericWrapper> An error occured while handling afterRequest', error);
    }
};

const injectFunctionIdentifier = (func: any) => {
    if (func && !func.__THUNDRA_ID__) {
        func.__THUNDRA_ID__ = Utils.generateShortUuid();
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

        try {
            ThundraLogger.debug('<GenericWrapper> Before handling request');

            await beforeRequest(func);
            beforeRequestCalled = true;

            const result = func(...args);
            if (result && result.then && typeof result.then === 'function') {
                asyncFunction = true;
                result.then(async () => {
                    await afterRequest(func);
                }).catch(async (error: Error) => {
                    context.setError(error);
                    await afterRequest(func);

                    throw error;
                });
            }

            return result;
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
    injectFunctionIdentifier(func);
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
