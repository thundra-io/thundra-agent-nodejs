/**
 * The entry point of Thundra Node.js agent
 */

import ConfigProvider from './config/ConfigProvider';
import config from './plugins/config';
import listeners from './listeners';
import samplers from './samplers';
import Utils from './utils/Utils';
import {EnvVariableKeys} from './Constants';
import InvocationSupport from './plugins/support/InvocationSupport';
import InvocationTraceSupport from './plugins/support/InvocationTraceSupport';
import support from './plugins/support';
import ConfigNames from './config/ConfigNames';
import {loadHandler} from './wrappers/lambda/lambdaRuntimeSupport';
import * as ExpressWrapper from './wrappers/express/ExpressWrapper';
import * as LambdaWrapper from './wrappers/lambda/LambdaWrapper';
import ExecutionContextManager from './context/ExecutionContextManager';
import LogManager from './plugins/LogManager';
import InitManager from './init/InitManager';
import ModuleUtils from './utils/ModuleUtils';
import * as Foresight from './wrappers/foresight';

// Check if multiple instances of package exist
if (!global.__thundraImports__) {
    global.__thundraImports__ = {};
}
global.__thundraImports__[__filename] = true;
if (Object.keys(global.__thundraImports__).length > 1) {
    let message = '[THUNDRA] Beware that multiple instances of "@thundra/core" package exist in the following locations!';
    for (const location in global.__thundraImports__) {
        message += `\r\n${location}`;
    }
    console.warn(message);
}

let initialized = false;

/**
 * Initialized agent with given options (configs, etc ...)
 * @param options the options (configs, etc ...) to initialize agent
 */
function init(options?: any) {
    if (!initialized) {
        ConfigProvider.init(options);
        InitManager.init();
        Foresight.init();
        initialized = true;
    }
}

/**
 * Creates {@link LambdaWrapper} to wrap the original AWS Lambda handler
 * @param options the options (configs, etc ...) to initialize agent
 * @return {LambdaWrapper} the AWS Lambda wrapper to wrap the original handler
 */
function createLambdaWrapper(options?: any) {
    init(options);
    return LambdaWrapper.createWrapper();
}

/**
 * Wraps the given original AWS Lambda handler
 * @param handler the original AWS Lambda handler to be wrapped
 * @return the wrapped handler
 */
function lambdaWrapper(handler: any) {
    if (!initialized) {
        // If not initialized yet, init without any option
        init();
    }
    const wrapper = LambdaWrapper.createWrapper();
    return wrapper(handler);
}

/**
 * Creates an Express.js middleware to integrate Thundra
 * @return the Thundra middleware
 */
function expressMW() {
    if (!initialized) {
        init();
    }
    return ExpressWrapper.expressMW();
}

/**
 * Creates {@link Logger} with given options
 * @param options the options (configs, etc ...) to initialize logger to be created
 */
function createLogger(options: any) {
    return LogManager.createLogger(options);
}

/**
 * Loads and returns the user AWS Lambda handler
 * @return the loaded user AWS Lambda handler
 */
function loadUserHandler() {
    return loadHandler(
        Utils.getEnvVar(EnvVariableKeys.LAMBDA_TASK_ROOT),
        ConfigProvider.get(ConfigNames.THUNDRA_LAMBDA_HANDLER),
    );
}

/**
 * Adds given log listener
 * @param listener the log listener to be added
 */
function addLogListener(listener: any) {
    LogManager.addListener(listener);
}

/**
 * Gets the tracer
 * @return {Tracer} the tracer
 */
function tracer() {
    return ExecutionContextManager.get().tracer;
}

/**
 * Instruments given module if it is supported
 * @param moduleName {string} name of the module to be instrumented
 * @param module the module to be instrumented
 * @return {boolean} {@code true} if the given has been instrumented,
 *                   {@code false} otherwise
 */
function instrumentModule(moduleName: string, module: any): boolean {
    return ModuleUtils.instrumentModule(moduleName, module);
}

/**
 * Uninstruments given module if it is supported and already instrumented
 * @param moduleName {string} name of the module to be uninstrumented
 * @param module the module to be uninstrumented
 * @return {boolean} {@code true} if the given has been uninstrumented,
 *                   {@code false} otherwise
 */
function uninstrumentModule(moduleName: string, module: any): boolean {
    return ModuleUtils.uninstrumentModule(moduleName, module);
}

const updateConfig = config.ThundraConfig.updateConfig;

if (global.__thundraMasterModule__) {
    // This is another Thundra module which is the master module

    const thundraMasterModule = global.__thundraMasterModule__;

    console.warn(`[THUNDRA] Thundra master module detected at ${thundraMasterModule.fileName}.`,
        `So delegating from current module at ${__filename} to the master module.`);

    // Expose master module exports
    module.exports = thundraMasterModule.moduleExports;
} else {
    // This is the Thundra master module,

    // Expose Lambda wrapper creator by default
    module.exports = createLambdaWrapper;

    // Named exports
    Object.assign(module.exports, {
        config,
        samplers,
        listeners,
        init,
        updateConfig,
        createLogger,
        loadUserHandler,
        addLogListener,
        createLambdaWrapper,
        lambdaWrapper,
        tracer,
        instrumentModule,
        uninstrumentModule,
        expressMW,
        InvocationSupport,
        InvocationTraceSupport,
        ...support,
    });

    global.__thundraMasterModule__ = {
        fileName: __filename,
        moduleExports: module.exports,
    };
}
