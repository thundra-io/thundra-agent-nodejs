import ModuleUtils from '../../utils/ModuleUtils';

import Reporter from '../../Reporter';
import ConfigProvider from '../../config/ConfigProvider';
import ConfigNames from '../../config/ConfigNames';
import ExecutionContextManager from '../../context/ExecutionContextManager';
import ExecutionContext from '../../context/ExecutionContext';

import ThundraLogger from '../../ThundraLogger';
import { ClassNames, DomainNames } from '../../Constants';
import LambdaUtils from '../../utils/LambdaUtils';
import WrapperUtils from '../WebWrapperUtils';
import Utils from '../../utils/Utils';

import * as HapiExecutor from './HapiExecutor';
import WebWrapperUtils from '../WebWrapperUtils';

const ApplicationClassName = ClassNames.HAPI;
const ApplicationDomainName = DomainNames.API;

const modulesWillBepatched: any = {
    '@hapi/hapi': [ 'Server', 'server' ],
    'hapi': [ 'Server', 'server' ],
};

let _REPORTER: Reporter;
let _PLUGINS: any[];

/**
 * Handle Hapi server creation process
 * @param {Function} wrappedFunction
 */
function hapiServerWrapper(wrappedFunction: Function) {

    return function internalHapiServerWrapper() {

        ThundraLogger.debug('<HapiWrapper> Hapi server wrapped.');

        const server = wrappedFunction.apply(this, arguments);

        /**
         * Handler method for incoming requests & start instrumentation process
         */
        const startInstrument = (request: any) => ExecutionContextManager.runWithContext(
            () => {
                return WrapperUtils.createExecContext(ApplicationClassName, ApplicationDomainName);
            },
            async function () {

            ThundraLogger.debug('<HapiWrapper> Running with execution context');

            const context: ExecutionContext = this;

            request.hostname = request.info.hostname;
            request.thundra = {
                executionContext: context,
            };

            ThundraLogger.debug('<HapiWrapper> Before handling request');
            await WrapperUtils.beforeRequest(request, request.response, _PLUGINS);
        });

        /**
         * Handler method for outgoing response & finish instrumentation process
         */
        const finishInstrument = async (request: any, response: any) => {

            ThundraLogger.debug('<HapiWrapper> Finish Instrumentation');

            if (request.thundra && request.thundra.executionContext) {
                const context = request.thundra.executionContext;
                context.response = response;

                ExecutionContextManager.set(context);

                if (response.isBoom) {
                    context.error = Utils.buildError(response);
                }

                ThundraLogger.debug('<HapiWrapper> After handling request');
                await WrapperUtils.afterRequest(request, response, _PLUGINS, __PRIVATE__.getReporter());
            }
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

            ThundraLogger.debug(`<HapiWrapper> Instrumentation finished for request: ${request}`);

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
 * Instrument Hapi wrapper & wrap Hapi server process
 */
export const init = () => {

    const isHapiTracingDisabled = ConfigProvider.get<boolean>(ConfigNames.THUNDRA_TRACE_INTEGRATIONS_HAPI_DISABLE);

    if (isHapiTracingDisabled) {

        ThundraLogger.debug('<HapiWrapper> Hapi wrapper disabled ...');

        return false;
    }

    const lambdaRuntime = LambdaUtils.isLambdaRuntime();
    if (!lambdaRuntime) {

        ThundraLogger.debug('<HapiWrapper> Initializing ...');

        const {
            reporter,
            plugins,
        } = WebWrapperUtils.initWrapper(
            ApplicationClassName,
            ApplicationDomainName,
            HapiExecutor);

        WrapperUtils.initAsyncContextManager();

        _REPORTER = reporter;
        _PLUGINS = plugins;

        Object.keys(modulesWillBepatched).forEach((moduleName: any) => {
            ModuleUtils.instrument(
                [moduleName], undefined,
                (lib: any, cfg: any) => {

                    let moduleWillBeInitilized = false;
                    modulesWillBepatched[moduleName].forEach((methodName: any) => {

                        const isPatched: boolean = ModuleUtils.patchModule(
                            moduleName,
                            methodName,
                            hapiServerWrapper,
                            (Hapi: any) => Hapi,
                            lib);

                        if (!moduleWillBeInitilized) {
                            moduleWillBeInitilized = isPatched;
                            return;
                        }
                    });
                },
                (lib: any, cfg: any) => { /* empty */ },
                {});
        });

        return true;
    } else {
        ThundraLogger.debug('<HapiWrapper> Skipping initializing due to running in lambda runtime ...');

        return false;
    }
};

/* test-code */
export const __PRIVATE__ = {
    getReporter: () => {
        return _REPORTER;
    },
};
/* end-test-code */
