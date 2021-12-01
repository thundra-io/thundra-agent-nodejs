import {ClassNames, DomainNames} from '../../Constants';
import WrapperUtils from '../WebWrapperUtils';
import ConfigProvider from '../../config/ConfigProvider';
import * as KoaExecutor from './KoaExecutor';
import ThundraLogger from '../../ThundraLogger';
import ExecutionContextManager from '../../context/ExecutionContextManager';
import ExecutionContext from '../../context/ExecutionContext';
import LambdaUtils from '../../utils/LambdaUtils';
import ModuleUtils from '../../utils/ModuleUtils';
import Utils from '../../utils/Utils';
import ConfigNames from '../../config/ConfigNames';
import Reporter from '../../Reporter';

const ApplicationClassName = ClassNames.KOA;
const ApplicationDomainName = DomainNames.API;

let _REPORTER: Reporter;
let _PLUGINS: any[];
let initialized = false;

const initWrapperContext = () => {
    if (initialized) {
        return;
    }

    ThundraLogger.debug('<KoaWrapper> Initializing ...');
    initialized = true;
    const {
        reporter,
        plugins,
    } = WrapperUtils.initWrapper(KoaExecutor);

    _REPORTER = reporter;
    _PLUGINS = plugins;

    WrapperUtils.initAsyncContextManager();
};

export function koaMiddleWare(opts: any = {}) {

    ThundraLogger.debug('<KoaWrapper> Creating Thundra middleware ...');

    return async (ctx: any, next: any) => ExecutionContextManager.runWithContext(
        () => {
            return WrapperUtils.createExecContext(ApplicationClassName, ApplicationDomainName);
        },
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
                    WrapperUtils.afterRequest(ctx.request, ctx.response, _PLUGINS, __PRIVATE__.getReporter());
                },
            };
            try {
                ThundraLogger.debug('<KoaWrapper> Before handling request');
                await WrapperUtils.beforeRequest(ctx.request, ctx.response, _PLUGINS);
                ctx.res.once('finish', () => {
                    ctx.request._matchedRoute = ctx._matchedRoute;
                    ExecutionContextManager.set(context);
                    ThundraLogger.debug('<KoaWrapper> After handling request');
                    WrapperUtils.afterRequest(ctx.request, ctx.response, _PLUGINS,  __PRIVATE__.getReporter());
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

    const lambdaRuntime = LambdaUtils.isLambdaRuntime();
    if (!lambdaRuntime) {
        ModuleUtils.instrument(
            ['koa/lib/application.js'], undefined,
            (lib: any, cfg: any) => {

                initWrapperContext();

                ModuleUtils.patchModule(
                    'koa/lib/application.js',
                    'use',
                    wrapUse,
                    (Koa: any) => Koa.prototype,
                    lib);
            },
            (lib: any, cfg: any) => { /* empty */ },
            {});
    }  else {
        ThundraLogger.debug('<KoaWrapper> Skipping initializing due to running in lambda runtime ...');
    }
}

export const __PRIVATE__ = {
    getReporter: () => {
        return _REPORTER;
    },
};
