import BasePluginConfig from './BasePluginConfig';
import TraceDef from './TraceDef';
import {envVariableKeys } from '../../Constants';
import IntegrationConfig from './IntegrationConfig';
import Utils from '../Utils';
import ThundraLogger from '../../ThundraLogger';
const koalas = require('koalas');

class TraceConfig extends BasePluginConfig {
    disableRequest: boolean;
    disableResponse: boolean;
    tracerConfig: any;
    traceDefs: TraceDef[];
    maskRequest: (request: any) => any;
    maskResponse: (response: any) => any;
    integrations: IntegrationConfig[];

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
        this.traceDefs = [];

        for (const key of Object.keys(process.env)) {
            if (key.startsWith(envVariableKeys.THUNDRA_LAMBDA_TRACE_TRACE_DEF)) {
                try {
                    this.traceDefs.push(this.parseTraceDefEnvVariable(process.env[key]));
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

        if (options.traceDefs) {
            for (const def of options.traceDefs) {
                const option = new TraceDef(def.pattern);
                option.setPropertyFromConfig(def);
                this.traceDefs.push(option);
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

    parseTraceDefEnvVariable(value: string): TraceDef {
        const args = value.substring(value.indexOf('[') + 1, value.indexOf(']')).split(',');
        const pattern = value.substring(0, value.indexOf('['));
        const option: TraceDef = new TraceDef(pattern);
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
