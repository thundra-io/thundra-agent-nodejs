/**
 * The entry point of Thundra Node.js agent
 */

import ConfigProvider from './config/ConfigProvider';
import config from './plugins/config';
import listeners from './opentracing/listeners';
import samplers from './opentracing/sampler';
import Utils from './utils/Utils';
import { EnvVariableKeys } from './Constants';
import InvocationSupport from './plugins/support/InvocationSupport';
import InvocationTraceSupport from './plugins/support/InvocationTraceSupport';
import ConfigNames from './config/ConfigNames';
import { loadHandler } from './wrappers/lambda/lambdaRuntimeSupport';
import * as LambdaWrapper from './wrappers/lambda/LambdaWrapper';
import ExecutionContextManager from './context/ExecutionContextManager';
import LogManager from './plugins/LogManager';

let initialized = false;

/**
 * Initialized agent with given options (configs, etc ...)
 * @param options the options (configs, etc ...) to initialize agent
 */
function init(options?: any) {
    ConfigProvider.init(options);
    initialized = true;
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

const updateConfig = config.ThundraConfig.updateConfig;

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
    InvocationSupport,
    InvocationTraceSupport,
});
