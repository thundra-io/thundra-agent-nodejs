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

/**
 * Create reporter instance
 * @param {string} apiKey
 * @return {Reporter} reporter
 */
function createReporter(apiKey: string): Reporter {
    return new Reporter(apiKey);
}

/**
 * Create plugin context instance
 * @param {apiKey} apiKey
 * @return {PluginContext} pluging context
 */
function createPluginContext(apiKey: string): PluginContext {
    return WrapperUtils.createPluginContext(apiKey, HapiExecutor);
}

/**
 * Handle Hapi server creation process
 * @param {ThundraConfig} config
 * @param {pluginContext} PluginContext
 * @return {any[]} plugings
 */
function createPlugins(config: ThundraConfig, pluginContext: PluginContext): any[] {
    return WrapperUtils.createPlugins(config, pluginContext);
}

/**
 * Handle Hapi server creation process
 * @param {Function} wrappedFunction
 */
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

        ThundraLogger.debug('<HapiWrapper> Hapi server wrapped.');

        const server = wrappedFunction.apply(this, arguments);

        /**  
         * Handler method for incoming requests & start instrumentation process
        */
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

        /**  
         * Handler method for outgoing response & finish instrumentation process
        */
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

        /**  
         * Attach onPreHandler event of Hapi server
         * it will start instrumentation process
        */
        server.ext('onPreHandler', (request: any, h: any) => {

            ThundraLogger.debug(`<HapiWrapper> Instrumentation started for request: ${request}`);

            startInstrument(request);

            return h.continue;
        });

        /**  
         * Attach onPreResponse event of Hapi server
         * it will finish instrumentation process
        */
        server.ext('onPreResponse', async (request: any, h: any) => {

            ThundraLogger.debug(`<HapiWrapper> Instrumentation finished for request: ${request}`)

            const response = request.response;
            if (response.isBoom) {
                const statusCode = response.output.statusCode;
                if (statusCode === 404) {
                    /**  
                     * if statusCode equels to 404 onPreHandler will not fired 
                     * so instrumentation process must be started in here
                    */
                    startInstrument(request);
                }
            }

            await finishInstrument(request, response);

            return h.continue;
        });

        return server;
    };
}

/**
 * Initiate Hapi wrapper & wrap Hapi server process
 */
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
