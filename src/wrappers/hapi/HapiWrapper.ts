import ModuleUtils from '../../utils/ModuleUtils';

import { ApplicationManager } from '../../application/ApplicationManager';
import Reporter from '../../Reporter';
import ConfigProvider from '../../config/ConfigProvider';
import ExecutionContextManager from '../../context/ExecutionContextManager';
import ExecutionContext from '../../context/ExecutionContext';

import ThundraLogger from '../../ThundraLogger';
import { ClassNames, DomainNames } from '../../Constants';
import LambdaUtils from '../../utils/LambdaUtils';
import WrapperUtils from '../WebWrapperUtils';

import PluginContext from '../../plugins/PluginContext';
import ThundraConfig from '../../plugins/config/ThundraConfig';

import * as HapiExecutor from './HapiExecutor';

function createReporter(apiKey: string): Reporter {
    return new Reporter(apiKey);
}

function createPluginContext(apiKey: string): PluginContext {
    return WrapperUtils.createPluginContext(apiKey, HapiExecutor);
}

function createPlugins(config: ThundraConfig, pluginContext: PluginContext): any[] {
    return WrapperUtils.createPlugins(config, pluginContext);
}

function hapiServerWrapper(wrappedFunction: Function) {

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

    const pluginContext = createPluginContext(apiKey);
    const reporter = __PRIVETE__.createReporter(apiKey);
    const plugins = createPlugins(config, pluginContext);

    return function internalHapiServerWrapper() {

        const server = wrappedFunction.apply(this, arguments);

        const startInstrument = (request: any) => ExecutionContextManager.runWithContext(
            WrapperUtils.createExecContext, async function () {

            ThundraLogger.debug('<HapiWrapper> Running with execution context');

            const context: ExecutionContext = this;

            request.hostname = request.info.hostname;
            request.thundra = {
                executionContext: context,
            };

            ThundraLogger.debug('<HapiWrapper> Before handling request');
            await WrapperUtils.beforeRequest(request, request.response, plugins);
        });

        const finishInstrument = async (request: any, response: any) => {

            ThundraLogger.debug('<HapiWrapper> Finish Instrumentation');

            const context = request.thundra.executionContext;
            context.response = response;

            ExecutionContextManager.set(context);

            if (response.isBoom) {
                context.error = response;
            }

            ThundraLogger.debug('<HapiWrapper> After handling request');
            await WrapperUtils.afterRequest(request, response, plugins, reporter);
        };

        server.ext('onPreHandler', (request: any, h: any) => {
            startInstrument(request);

            return h.continue;
        });

        server.ext('onPreResponse', async (request: any, h: any) => {
            const response = request.response;
            if (response.isBoom) {
                const statusCode = response.output.statusCode;
                if (statusCode === 404) {
                    startInstrument(request);
                }
            }

            await finishInstrument(request, response);

            return h.continue;
        });

        return server;
    };
}

export const init = () => {
    ThundraLogger.debug('<HapiWrapper> Initializing ...');
    const lambdaRuntime = LambdaUtils.isLambdaRuntime();
    if (!lambdaRuntime) {
        ModuleUtils.patchModule(
            '@hapi/hapi',
            'Server',
            hapiServerWrapper,
        );
        ModuleUtils.patchModule(
            '@hapi/hapi',
            'server',
            hapiServerWrapper,
        );
        ModuleUtils.patchModule(
            'hapi',
            'server',
            hapiServerWrapper,
        );
        ModuleUtils.patchModule(
            'hapi',
            'Server',
            hapiServerWrapper,
        );
    } else {
        ThundraLogger.debug('<HapiWrapper> Skipping initializing due to running in lambda runtime ...');
    }
};

/* test-code */
export const __PRIVETE__ = {
    createReporter,
};
/* end-test-code */
