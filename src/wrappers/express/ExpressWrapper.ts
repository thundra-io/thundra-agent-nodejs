import Reporter from '../../Reporter';
import ConfigProvider from '../../config/ConfigProvider';
import {ApplicationManager} from '../../application/ApplicationManager';
import ExecutionContextManager from '../../context/ExecutionContextManager';
import * as ExpressExecutor from './ExpressExecutor';
import WrapperUtils from '../WebWrapperUtils';
import ExecutionContext from '../../context/ExecutionContext';
import ThundraLogger from '../../ThundraLogger';
import {ClassNames, DomainNames} from '../../Constants';
import ModuleUtils from '../../utils/ModuleUtils';
import Utils from '../../utils/Utils';
import LambdaUtils from '../../utils/LambdaUtils';

export function expressMW(opts: any = {}) {
    ApplicationManager.setApplicationInfoProvider().update({
        applicationClassName: ClassNames.EXPRESS,
        applicationDomainName: DomainNames.API,
    });

    const appInfo = ApplicationManager.getApplicationInfo();
    ApplicationManager.getApplicationInfoProvider().update({
        applicationId: WrapperUtils.getDefaultApplicationId(appInfo),
    });

    const config = opts.config || ConfigProvider.thundraConfig;
    const {apiKey} = config;
    const reporter = opts.reporter || new Reporter(apiKey);
    const pluginContext = opts.pluginContext || WrapperUtils.createPluginContext(apiKey, ExpressExecutor);
    const plugins = opts.plugins || WrapperUtils.createPlugins(config, pluginContext);

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
    ThundraLogger.debug('<ExpressWrapper> Using original middleware as middleware wrapper');
    return originalMiddleware;
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
    } else {
        ThundraLogger.debug('<ExpressWrapper> Skipping initializing due to running in lambda runtime ...');
    }
}
