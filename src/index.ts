import ConfigProvider from './config/ConfigProvider';
import configs from './plugins/config';
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
    const config = new configs.ThundraConfig(options);
    if (config.disableThundra) {
        return (originalFunc: any) => originalFunc;
    }
    if (!(config.apiKey)) {
        console.warn(`Thundra API Key is not given, monitoring is disabled.`);
    }

    return LambdaWrapper.createWrapper(config);
}

function createLogger(options: any) {
    if (!Log.getInstance()) {
        const logConfig = new configs.LogConfig({});
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

module.exports = createWrapper;
module.exports.createLogger = createLogger;
module.exports.loadUserHandler = loadUserHandler;
module.exports.addLogListener = addLogListener;
module.exports.updateConfig = configs.ThundraConfig.updateConfig;
module.exports.tracer = () => LambdaWrapper.tracer;
module.exports.config = configs;
module.exports.samplers = samplers;
module.exports.listeners = listeners;
module.exports.InvocationSupport = InvocationSupport;
module.exports.InvocationTraceSupport = InvocationTraceSupport;
