import {ApplicationManager} from '../../application/ApplicationManager';
import {ClassNames, DomainNames} from '../../Constants';
import WrapperUtils from '../WebWrapperUtils';
import ConfigProvider from '../../config/ConfigProvider';
import Reporter from '../../Reporter';
import * as KoaExecutor from './KoaExecutor';
import ThundraLogger from '../../ThundraLogger';
import ExecutionContextManager from '../../context/ExecutionContextManager';
import ExecutionContext from '../../context/ExecutionContext';
import LambdaUtils from '../../utils/LambdaUtils';
import ModuleUtils from '../../utils/ModuleUtils';
import Utils from '../../utils/Utils';

export function koaMiddleWare(opts: any = {}) {
    ThundraLogger.debug('<KoaWrapper> koaMiddleWare running ...');

    ApplicationManager.setApplicationInfoProvider().update({
        applicationClassName: ClassNames.KOA,
        applicationDomainName: DomainNames.API,
    });

    const appInfo = ApplicationManager.getApplicationInfo();
    ApplicationManager.getApplicationInfoProvider().update({
        applicationId: WrapperUtils.getDefaultApplicationId(appInfo),
    });

    const config = opts.config || ConfigProvider.thundraConfig;
    const {apiKey} = config;
    const reporter = opts.reporter || new Reporter(apiKey);
    const pluginContext = opts.pluginContext || WrapperUtils.createPluginContext(apiKey, KoaExecutor);
    const plugins = opts.plugins || WrapperUtils.createPlugins(config, pluginContext);

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
                await WrapperUtils.beforeRequest(ctx.request, ctx.response, plugins);
                ctx.res.once('finish', () => {
                    ctx.request._matchedRoute = ctx._matchedRoute;
                    ExecutionContextManager.set(context);
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
        const result = originalUse.apply(this, arguments);
        if (this._thundra) {
            return result;
        }
        this._thundra = true;
        this.on('error', async (err: any, ctx: any) => {
            if (ctx.thundra) {
                ctx.thundra.setError(err);
            }
        });
        return result;
    };
}

export function init() {
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
