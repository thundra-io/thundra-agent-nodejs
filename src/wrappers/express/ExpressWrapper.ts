import Reporter from '../../Reporter';
import ConfigProvider from '../../config/ConfigProvider';
import { ApplicationManager } from '../../application/ApplicationManager';
import ExecutionContextManager from '../../context/ExecutionContextManager';
import * as ExpressExecutor from './ExpressExecutor';
import WrapperUtils from '../WebWrapperUtils';
import ExecutionContext from '../../context/ExecutionContext';
import ThundraLogger from '../../ThundraLogger';
import { ClassNames, DomainNames } from '../../Constants';
import ModuleUtils from '../../utils/ModuleUtils';
import Utils from '../../utils/Utils';
import LambdaUtils from '../../utils/LambdaUtils';

const http = require('http');

const METHODS = http.METHODS && http.METHODS.map((method: string) => {
    return method.toLowerCase();
});

export function expressMW(opts: any = {}) {

    const {
        reporter,
        plugins,
    } = WrapperUtils.initWrapper(ClassNames.EXPRESS, DomainNames.API, ExpressExecutor);

    if (!opts.disableAsyncContextManager) {
        WrapperUtils.initAsyncContextManager();
    }

    ThundraLogger.debug('<ExpressWrapper> Creating Thundra middleware ...');

    return (req: any, res: any, next: any) => ExecutionContextManager.runWithContext(
        WrapperUtils.createExecContext,
        async function () {
            ThundraLogger.debug('<ExpressWrapper> Running with execution context');
            const context: ExecutionContext = this;
            req.thundra = {
                executionContext: context,
                setError(err: any) {
                    context.error = Utils.buildError(err);
                },
                report() {
                    ExecutionContextManager.set(context);
                    ThundraLogger.debug('<ExpressWrapper> Reporting request');
                    WrapperUtils.afterRequest(req, res, plugins, reporter);
                },
            };
            try {
                ThundraLogger.debug('<ExpressWrapper> Before handling request');
                await WrapperUtils.beforeRequest(req, res, plugins);
                res.once('finish', () => {
                    ExecutionContextManager.set(context);
                    ThundraLogger.debug('<ExpressWrapper> After handling request');
                    WrapperUtils.afterRequest(req, res, plugins, reporter);
                });
            } catch (err) {
                ThundraLogger.error('<ExpressWrapper> Error occurred in ExpressWrapper:', err);
            } finally {
                ThundraLogger.debug('<ExpressWrapper> Calling next middleware');
                next();
            }
        },
    );
}

function wrapMiddleware(originalMiddleware: Function) {
    ThundraLogger.debug('<ExpressWrapper> Wrapping original middleware ...');
    if (originalMiddleware.length === 4) {
        ThundraLogger.debug('<ExpressWrapper> Using error aware wrapped middleware as middleware wrapper');
        return function errorAwareMiddlewareWrapper(err: Error, req: any, res: any, next: Function) {
            if (err && req.thundra) {
                ThundraLogger.debug(
                    '<ExpressWrapper> Setting error into execution context by error aware wrapped middleware:', err);
                req.thundra.setError(err);
            }
            ThundraLogger.debug('<ExpressWrapper> Calling original middleware by error aware wrapped middleware');
            return originalMiddleware.apply(this, arguments);
        };
    }
    ThundraLogger.debug('<ExpressWrapper> Using wrapped middleware as middleware wrapper');
    return function internalMiddlewareWrapper(req: any, res: any, next: Function) {
        ThundraLogger.debug('<ExpressWrapper> Calling original middleware by wrapped middleware');
        // No need to put inside try/catch here
        // because, sync errors are already delegated to error aware handlers
        const result = originalMiddleware.apply(this, [req, res, next]);
        if (result && typeof result.catch === 'function') {
            ThundraLogger.debug('<ExpressWrapper> Original middleware returned Promise, hooking into "catch"');
            return result.catch((err: Error) => {
                // We detected an uncaught exception here as it was reached through our catch callback
                // as either there is no catch callback or previous catch callbacks rethrow error
                if (err && req.thundra) {
                    ThundraLogger.debug(
                        '<ExpressWrapper> Setting error into execution context by wrapped middleware:', err);
                    req.thundra.setError(err);
                    // As uncaught exceptions are not handled inside regular flow,
                    // status code is not set accordingly.
                    // So we are setting status code to 500 to indicate that it is "Internal Server Error"
                    // TODO Do we need to revert back after reporting???
                    res.statusCode = 500;
                    ThundraLogger.debug('<ExpressWrapper> Uncaught error detected so reporting request forcefully');
                    // We should report here as uncaught exception will cut down the regular flow
                    req.thundra.report();
                }
                throw err;
            });
        }
        return result;
    };
}

function wrapMethod(originalMethod: Function, name: string) {
    ThundraLogger.debug(`<ExpressWrapper> Wrapping "app.${name}" method ...`);
    return function internalMethodWrapper() {
        for (let i = 0; i < arguments.length; i++) {
            if (arguments[i] && typeof arguments[i] === 'function') {
                ThundraLogger.debug(`<ExpressWrapper> Wrapping original middleware for "app.${name}" method`);
                arguments[i] = wrapMiddleware(arguments[i]);
            }
        }
        ThundraLogger.debug(`<ExpressWrapper> Calling original "app.${name}" method by wrapped method`);
        return originalMethod.apply(this, arguments);
    };
}

function wrapUse(originalUse: Function) {
    ThundraLogger.debug('<ExpressWrapper> Wrapping "app.use" ...');
    return function useWrapper() {
        if (arguments.length > 1) {
            const middleware = arguments[1];
            // If second argument is a function and not a Thundra middleware
            if (typeof middleware === 'function' && !middleware._thundra) {
                arguments[1] = wrapMiddleware(middleware);
            }
        }
        ThundraLogger.debug('<ExpressWrapper> Calling original "app.use"');
        return originalUse.apply(this, arguments);
    };
}

function wrapListen(originalListen: Function) {
    ThundraLogger.debug('<ExpressWrapper> Wrapping "app.listen" ...');
    return function listenWrapper() {
        ThundraLogger.debug('<ExpressWrapper> Calling original "app.listen"');
        const errorAwareMiddleware = function (err: Error, req: any, res: any, next: Function) {
            if (err && req.thundra) {
                ThundraLogger.debug(
                    '<ExpressWrapper> Setting error into execution context by Thundra error aware middleware:', err);
                req.thundra.setError(err);
            }
            next(err);
        };
        // Mark error aware middleware as Thundra middleware
        Object.defineProperty(errorAwareMiddleware, '_thundra', {
            value: true,
            writable: false,
        });
        const result = originalListen.apply(this, arguments);
        this.use(errorAwareMiddleware);
        ThundraLogger.debug('<ExpressWrapper> Added Thundra error aware middleware');
        return result;
    };
}

export function init() {
    ThundraLogger.debug('<ExpressWrapper> Initializing ...');
    const lambdaRuntime = LambdaUtils.isLambdaRuntime();
    if (!lambdaRuntime) {
        ModuleUtils.patchModule(
            'express',
            'use',
            wrapUse,
            (express: any) => express.Router);
        ModuleUtils.patchModule(
            'express',
            'listen',
            wrapListen,
            (express: any) => express.application);
        METHODS.forEach((method: string) => {
            ModuleUtils.patchModule(
                'express',
                method,
                wrapMethod,
                (express: any) => express.Route.prototype);
        });

        return true;
    } else {
        ThundraLogger.debug('<ExpressWrapper> Skipping initializing due to running in lambda runtime ...');

        return false;
    }
}
