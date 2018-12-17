import BasePluginConfig from './BasePluginConfig';
import TraceableConfig from './TraceableConfig';
import {envVariableKeys, INTEGRATIONS } from '../../Constants';
import IntegrationConfig from './IntegrationConfig';
import Utils from '../utils/Utils';
import ThundraLogger from '../../ThundraLogger';
import TraceSamplerConfig from './TraceSamplerConfig';
import Integration from '../integrations/Integration';
import Instrumenter from '../../opentracing/instrument/Instrumenter';
const koalas = require('koalas');

class TraceConfig extends BasePluginConfig {
    disableRequest: boolean;
    disableResponse: boolean;
    tracerConfig: any;
    traceableConfigs: TraceableConfig[];
    maskRequest: (request: any) => any;
    maskResponse: (response: any) => any;
    disabledIntegrations: IntegrationConfig[];
    disableInstrumentation: boolean;
    samplerConfig: TraceSamplerConfig;
    integrationsMap: Map<string, Integration>;
    instrumenter: Instrumenter;

    constructor(options: any) {
        options = options ? options : {};
        super(koalas(options.enabled, true));
        this.disableRequest = koalas(Utils.getConfiguration(
            envVariableKeys.THUNDRA_LAMBDA_TRACE_REQUEST_SKIP) === 'true', options.disableRequest, false);
        this.disableResponse = koalas(Utils.getConfiguration(
            envVariableKeys.THUNDRA_LAMBDA_TRACE_RESPONSE_SKIP) === 'true', options.disableResponse, false);
        this.maskRequest = koalas(options.maskRequest, null);
        this.maskResponse = koalas(options.maskResponse, null);
        this.disabledIntegrations = koalas([]);
        this.tracerConfig = koalas(options.tracerConfig, {});
        this.traceableConfigs = [];
        this.disableInstrumentation = koalas(Utils.getConfiguration(
            envVariableKeys.THUNDRA_LAMBDA_TRACE_INSTRUMENT_DISABLE) === 'true',  options.disableInstrumentation, true);
        this.samplerConfig = new TraceSamplerConfig(options.samplerConfig);

        for (const key of Object.keys(process.env)) {
            if (key.startsWith(envVariableKeys.THUNDRA_LAMBDA_TRACE_INSTRUMENT_CONFIG)) {
                try {
                    this.traceableConfigs.push(this.parseTraceableConfigEnvVariable(process.env[key]));
                } catch (ex) {
                    ThundraLogger.getInstance().error(`Cannot parse trace def ${key}`);
                }
            }
            if (key.startsWith(envVariableKeys.THUNDRA_LAMBDA_TRACE_INTEGRATIONS_DISABLE)) {
                try {
                    this.disabledIntegrations.push(... this.parseIntegrationsEnvVariable(process.env[key]));
                } catch (ex) {
                    ThundraLogger.getInstance().error(`Cannot parse trace def ${key}`);
                }
            }
        }

        if (options.traceableConfigs) {
            for (const def of options.traceableConfigs) {
                const option = new TraceableConfig(def.pattern);
                option.setPropertyFromConfig(def);
                this.traceableConfigs.push(option);
            }
        }

        if (options.integrations) {
            for (const intgr of options.integrations) {
                if (typeof intgr === 'string') {
                    this.disabledIntegrations.push(new IntegrationConfig(intgr, {}));
                } else {
                    this.disabledIntegrations.push(new IntegrationConfig(intgr.name, intgr.opt));
                }
            }
        }

        if (!(this.disableInstrumentation) ||
                !(Utils.getConfiguration(envVariableKeys.THUNDRA_DISABLE_TRACE) === 'true')) {
            this.integrationsMap = new Map<string, Integration>();

            for (const key of Object.keys(INTEGRATIONS)) {
                const clazz = INTEGRATIONS[key];
                if (clazz) {
                    if (!this.integrationsMap.get(key)) {
                        if (!this.isConfigDisabled(key)) {
                            const instance = new clazz(key);
                            this.integrationsMap.set(key, instance);
                        }
                    }
                }
            }

            this.instrumenter = new Instrumenter(this);
            this.instrumenter.hookModuleCompile();
        }
    }

    parseTraceableConfigEnvVariable(value: string): TraceableConfig {
        const args = value.substring(value.indexOf('[') + 1, value.indexOf(']')).split(',');
        const pattern = value.substring(0, value.indexOf('['));
        const option: TraceableConfig = new TraceableConfig(pattern);
        for (const arg of args) {
            const tupple = arg.split('=');
            option.setProperty(tupple[0], tupple[1]);
        }
        return option;
    }

    parseIntegrationsEnvVariable(value: string): IntegrationConfig[] {
        const args = value.substring(value.indexOf('[') + 1, value.indexOf(']')).split(',');
        const configs: IntegrationConfig[] = [];
        for (const arg of args) {
            configs.push(new IntegrationConfig(arg, {enabled: false}));
        }
        return configs;
    }

    isConfigDisabled(name: string) {
        let disabled = false;
        for (const config of this.disabledIntegrations) {
            if (config.name === name && !config.enabled) {
                disabled = true;
            }
        }
        return disabled;
    }

    unhookModuleCompile() {
        this.instrumenter.unhookModuleCompile();
    }
}

export default TraceConfig;
