import {ClassNames, DomainNames} from '../../Constants';
import WrapperUtils from '../WebWrapperUtils';
import WebWrapperUtils from '../WebWrapperUtils';
import ConfigProvider from '../../config/ConfigProvider';
import * as KoaExecutor from './KoaExecutor';
import ThundraLogger from '../../ThundraLogger';
import ExecutionContextManager from '../../context/ExecutionContextManager';
import ExecutionContext from '../../context/ExecutionContext';
import LambdaUtils from '../../utils/LambdaUtils';
import ModuleUtils from '../../utils/ModuleUtils';
import Utils from '../../utils/Utils';
import ConfigNames from '../../config/ConfigNames';

export function koaMiddleWare(opts: any = {}) {
    ThundraLogger.debug('<KoaWrapper> koaMiddleWare running ...');
    const wrapperInitObj = WebWrapperUtils.initWrapper(ClassNames.KOA, DomainNames.API, KoaExecutor);
    const {plugins} = wrapperInitObj;
    let {reporter} = wrapperInitObj;

    if (opts.reporter) {
        reporter = opts.reporter;
    }

    if (!opts.disableAsyncContextManager) {
        WrapperUtils.initAsyncContextManager();
    }

    ThundraLogger.debug('<KoaWrapper> Creating Thundra middleware ...');

    return async (ctx: any, next: any) => ExecutionContextManager.runWithContext(
        WrapperUtils.createExecContext,
        async function () {
            ThundraLogger.debug('<KoaWrapper> Running with execution context');
            const context: ExecutionContext = this;
            ctx.thundra = {
                executionContext: context,
                setError(err: any) {
                    context.error = Utils.buildError(err);
                },
                report() {
                    ExecutionContextManager.set(context);
                    ThundraLogger.debug('<KoaWrapper> Reporting request');
                    WrapperUtils.afterRequest(ctx.request, ctx.response, plugins, reporter);
                },
            };
            try {
                ThundraLogger.debug('<KoaWrapper> Before handling request');
                await WrapperUtils.beforeRequest(ctx.request, ctx.response, plugins);
                ctx.res.once('finish', () => {
                    ctx.request._matchedRoute = ctx._matchedRoute;
                    ExecutionContextManager.set(context);
                    ThundraLogger.debug('<KoaWrapper> After handling request');
                    WrapperUtils.afterRequest(ctx.request, ctx.response, plugins, reporter);
                });
            } catch (err) {
                ThundraLogger.error('<KoaWrapper> Error occurred in KoaWrapper:', err);
            } finally {
                ThundraLogger.debug('<KoaWrapper> Calling next middleware');
                await next();
            }
        },
    );
}

function wrapUse(originalUse: Function) {
    ThundraLogger.debug('<KoaWrapper> Wrapping "app.use" ...');
    return function useWrapper() {
        if (!this._thundra) {
            this._thundra = true;
            this.use(koaMiddleWare());
            this.on('error', async (err: any, ctx: any) => {
                if (ctx.thundra) {
                    ctx.thundra.setError(err);
                }
            });
        }

        const result = originalUse.apply(this, arguments);
        return result;
    };
}

export function init() {
    const isKoaDisable = ConfigProvider.get<boolean>(ConfigNames.THUNDRA_TRACE_INTEGRATIONS_KOA_DISABLE);
    ThundraLogger.debug('<KoaWrapper> isKoaDisable ...', isKoaDisable);

    if (isKoaDisable) {
        ThundraLogger.debug('<KoaWrapper> Koa integration disabled. Skipping initializing ...');
        return;
    }

    ThundraLogger.debug('<KoaWrapper> Initializing ...');
    const lambdaRuntime = LambdaUtils.isLambdaRuntime();
    if (!lambdaRuntime) {
        ModuleUtils.patchModule(
            'koa/lib/application.js',
            'use',
            wrapUse,
            (Koa: any) => Koa.prototype);
    } else {
        ThundraLogger.debug('<KoaWrapper> Skipping initializing due to running in lambda runtime ...');
    }
}
