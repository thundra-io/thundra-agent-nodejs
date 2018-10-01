import BasePluginConfig from './BasePluginConfig';
import TraceableConfig from './TraceableConfig';
import {envVariableKeys } from '../../Constants';
import IntegrationConfig from './IntegrationConfig';
import Utils from '../Utils';
import ThundraLogger from '../../ThundraLogger';
const koalas = require('koalas');

class TraceConfig extends BasePluginConfig {
    disableRequest: boolean;
    disableResponse: boolean;
    tracerConfig: any;
    traceableConfigs: TraceableConfig[];
    maskRequest: (request: any) => any;
    maskResponse: (response: any) => any;
    integrations: IntegrationConfig[];
    disableInstrumentation: boolean;

    constructor(options: any) {
        options = options ? options : {};
        super(koalas(options.enabled, true));
        this.disableRequest = koalas(Utils.getConfiguration(
            envVariableKeys.THUNDRA_LAMBDA_TRACE_REQUEST_SKIP) === 'true', options.disableRequest, false);
        this.disableResponse = koalas(Utils.getConfiguration(
            envVariableKeys.THUNDRA_LAMBDA_TRACE_RESPONSE_SKIP) === 'true', options.disableResponse, false);
        this.maskRequest = koalas(options.maskRequest, null);
        this.maskResponse = koalas(options.maskResponse, null);
        this.integrations = koalas([]);
        this.tracerConfig = koalas(options.tracerConfig, {});
        this.traceableConfigs = [];
        this.disableInstrumentation = koalas(Utils.getConfiguration(
            envVariableKeys.THUNDRA_LAMBDA_TRACE_INSTRUMENT_DISABLE) === 'true',  options.disableInstrumentation, true);

        for (const key of Object.keys(process.env)) {
            if (key.startsWith(envVariableKeys.THUNDRA_LAMBDA_TRACE_INSTRUMENT_CONFIG)) {
                try {
                    this.traceableConfigs.push(this.parseTraceableConfigEnvVariable(process.env[key]));
                } catch (ex) {
                    ThundraLogger.getInstance().error(`Cannot parse trace def ${key}`);
                }
            }
            if (key.startsWith(envVariableKeys.THUNDRA_LAMBDA_TRACE_INTEGRATIONS)) {
                try {
                    this.integrations.push(... this.parseIntegrationsEnvVariable(process.env[key]));
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
                    this.integrations.push(new IntegrationConfig(intgr, {}));
                } else {
                    this.integrations.push(new IntegrationConfig(intgr.name, intgr.opt));
                }
            }
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
            configs.push(new IntegrationConfig(arg, {}));
        }
        return configs;
    }
}

export default TraceConfig;
