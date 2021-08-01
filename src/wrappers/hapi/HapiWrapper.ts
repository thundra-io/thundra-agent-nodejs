import ModuleUtils from '../../utils/ModuleUtils';

import { ApplicationManager } from '../../application/ApplicationManager';
import Reporter from '../../Reporter';
import ConfigProvider from '../../config/ConfigProvider';
import ExecutionContextManager from '../../context/ExecutionContextManager';
import ExecutionContext from '../../context/ExecutionContext';

import ThundraLogger from '../../ThundraLogger';
import { ClassNames, DomainNames } from '../../Constants';
import Utils from '../../utils/Utils';
import LambdaUtils from '../../utils/LambdaUtils';
import WrapperUtils from '../WebWrapperUtils';

import * as HapiExecutor from './HapiExecutor';

function hapiServerWrapper(wrappedFunction: Function, opts: any) {

    ThundraLogger.debug('<HapiWrapper> Creating Thundra middleware ...');

    ApplicationManager.setApplicationInfoProvider().update({
        applicationClassName: ClassNames.HAPI,
        applicationDomainName: DomainNames.API,
    });

    const appInfo = ApplicationManager.getApplicationInfo();
    ApplicationManager.getApplicationInfoProvider().update({
        applicationId: WrapperUtils.getDefaultApplicationId(appInfo),
    });

    const config = ConfigProvider.thundraConfig;
    const { apiKey } = config;

    const pluginContext = WrapperUtils.createPluginContext(apiKey, HapiExecutor);

    const reporter = opts.reporter || new Reporter(apiKey);
    const plugins = WrapperUtils.createPlugins(config, pluginContext);

    return function internalHapiServerWrapper() {

        const server = wrappedFunction.apply(this, arguments);
        server.ext('onPreHandler', (request: any, h: any) => ExecutionContextManager.runWithContext(
            WrapperUtils.createExecContext, async function () {
                ThundraLogger.debug('<HapiWrapper> Running with execution context');

                const context: ExecutionContext = this;     

                request.hostname = request.info.hostname
                request.thundra = {
                    executionContext: context,
                    setError(err: any) {
                        context.error = Utils.buildError(err);
                    },
                    report() {
                        ExecutionContextManager.set(context);
                        ThundraLogger.debug('<HapiWrapper> Reporting request');
                        WrapperUtils.afterRequest(request, request.response, plugins, reporter);
                    },
                };

                ThundraLogger.debug('<HapiWrapper> Before handling request');
                await WrapperUtils.beforeRequest(request, request.response, plugins);
                return h.continue;
            }
        ));

        server.ext('onPreResponse', async (request: any, h: any) => {
            const response = request.response;

            const context = request.thundra.executionContext;
            context.response = response;

            ExecutionContextManager.set(context);

            if (response.isBoom){
                context.error = response;
            }       

            ThundraLogger.debug('<HapiWrapper> After handling request');
            WrapperUtils.afterRequest(request, response, plugins, reporter);

            return h.continue;
        });

        return server;
    };
}

export function init(opts: any = {}) {
    ThundraLogger.debug('<HapiWrapper> Initializing ...');
    const lambdaRuntime = LambdaUtils.isLambdaRuntime();
    if (!lambdaRuntime) {
        ModuleUtils.patchModule(
            '@hapi/hapi',
            'Server',
            (wrappedFunction: Function) => hapiServerWrapper(wrappedFunction, opts)
        );
        ModuleUtils.patchModule(
            '@hapi/hapi',
            'server',
            (wrappedFunction: Function) => hapiServerWrapper(wrappedFunction, opts)
        );
        ModuleUtils.patchModule(
            'hapi',
            'server',
            (wrappedFunction: Function) => hapiServerWrapper(wrappedFunction, opts)
        );
        ModuleUtils.patchModule(
            'hapi',
            'Server',
            (wrappedFunction: Function) => hapiServerWrapper(wrappedFunction, opts)
        );
    } else {
        ThundraLogger.debug('<HapiWrapper> Skipping initializing due to running in lambda runtime ...');
    }
};