import ConfigProvider from './config/ConfigProvider';
import config from './plugins/config';
import listeners from './plugins/listeners';
import samplers from './opentracing/sampler';
import Utils from './plugins/utils/Utils';
import { EnvVariableKeys } from './Constants';
import InvocationSupport from './plugins/support/InvocationSupport';
import InvocationTraceSupport from './plugins/support/InvocationTraceSupport';
import ConfigNames from './config/ConfigNames';
import { loadHandler } from './lambda/lambdaRuntimeSupport';
import * as LambdaWrapper from './lambda/LambdaWrapper';
import ExecutionContextManager from './context/ExecutionContextManager';
import LogManager from './plugins/LogManager';

let initialized = false;

function init(options?: any) {
    ConfigProvider.init(options);
    initialized = true;
}

function createLambdaWrapper(options?: any) {
    init(options);
    return LambdaWrapper.createWrapper();
}

function lambdaWrapper(handler: any) {
    if (!initialized) {
        // If not initialized yet, init without any option
        init();
    }
    const wrapper = LambdaWrapper.createWrapper();
    return wrapper(handler);
}

function createLogger(options: any) {
    return LogManager.createLogger(options);
}

function loadUserHandler() {
    return loadHandler(
        Utils.getEnvVar(EnvVariableKeys.LAMBDA_TASK_ROOT),
        ConfigProvider.get(ConfigNames.THUNDRA_LAMBDA_HANDLER),
    );
}

function addLogListener(listener: any) {
    LogManager.addListener(listener);
}

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
