import ConfigProvider from './config/ConfigProvider';
import config from './plugins/config';
import listeners from './plugins/listeners';
import samplers from './opentracing/sampler';
import Utils from './plugins/utils/Utils';
import { EnvVariableKeys } from './Constants';
import Logger from './plugins/Logger';
import Log from './plugins/Log';
import InvocationSupport from './plugins/support/InvocationSupport';
import InvocationTraceSupport from './plugins/support/InvocationTraceSupport';
import ConfigNames from './config/ConfigNames';
import { loadHandler } from './runtime/RuntimeSupport';
import * as LambdaWrapper from './lambda/LambdaWrapper';

const get = require('lodash.get');

function createWrapper(options?: any) {
    ConfigProvider.init(get(options, 'config'), get(options, 'configFilePath'));
    const conf = new config.ThundraConfig(options);

    return LambdaWrapper.createWrapper(conf);
}

function createLogger(options: any) {
    if (!Log.getInstance()) {
        const logConfig = new config.LogConfig({});
        const logPlugin = new Log(logConfig);
        Logger.getLogManager().addListener(logPlugin);
    }
    return Logger.getLogManager().createLogger(options);
}

function loadUserHandler() {
    return loadHandler(
        Utils.getEnvVar(EnvVariableKeys.LAMBDA_TASK_ROOT),
        ConfigProvider.get(ConfigNames.THUNDRA_LAMBDA_HANDLER),
    );
}

function addLogListener(listener: any) {
    Logger.getLogManager().addListener(listener);
}

function tracer() {
    return LambdaWrapper.tracer;
}

const updateConfig = config.ThundraConfig.updateConfig;

// Default export
module.exports = createWrapper;

// Named exports
Object.assign(module.exports, {
    config,
    samplers,
    listeners,
    updateConfig,
    createLogger,
    loadUserHandler,
    addLogListener,
    tracer,
    InvocationSupport,
    InvocationTraceSupport,
});
