import BasePluginConfig from './BasePluginConfig';
import TraceableConfig from './TraceableConfig';
import {envVariableKeys, INTEGRATIONS } from '../../Constants';
import IntegrationConfig from './IntegrationConfig';
import Utils from '../utils/Utils';
import ThundraLogger from '../../ThundraLogger';
import Integration from '../integrations/Integration';
import Instrumenter from '../../opentracing/instrument/Instrumenter';
import Sampler from '../../opentracing/sampler/Sampler';
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
    integrationsMap: Map<string, Integration>;
    instrumenter: Instrumenter;
    maskRedisStatement: boolean;
    maskRdbStatement: boolean;
    maskDynamoDBStatement: boolean;
    maskElasticSearchStatement: boolean;
    maskMongoDBCommand: boolean;
    dynamoDBTraceInjectionEnabled: boolean;
    enableCloudWatchRequest: boolean;
    enableFirehoseRequest: boolean;
    enableKinesisRequest: boolean;
    maskSNSMessage: boolean;
    maskSQSMessage: boolean;
    maskAthenaStatement: boolean;
    maskLambdaPayload: boolean;
    maskHttpBody: boolean;
    sampler: Sampler<any>;
    runSamplerOnEachSpan: boolean;

    constructor(options: any) {
        options = options ? options : {};
        super(koalas(options.enabled, true));
        this.disableRequest = Utils.getConfiguration(
            envVariableKeys.THUNDRA_LAMBDA_TRACE_REQUEST_SKIP) ? Utils.getConfiguration(
                envVariableKeys.THUNDRA_LAMBDA_TRACE_REQUEST_SKIP) === 'true' : options.disableRequest;
        this.disableResponse = Utils.getConfiguration(
            envVariableKeys.THUNDRA_LAMBDA_TRACE_RESPONSE_SKIP) ? Utils.getConfiguration(
                envVariableKeys.THUNDRA_LAMBDA_TRACE_RESPONSE_SKIP) === 'true' : options.disableResponse;
        this.maskRequest = koalas(options.maskRequest, null);
        this.maskResponse = koalas(options.maskResponse, null);
        this.disabledIntegrations = koalas([]);
        this.tracerConfig = koalas(options.tracerConfig, {});
        this.traceableConfigs = [];
        this.disableInstrumentation = Utils.getConfiguration(
            envVariableKeys.THUNDRA_LAMBDA_TRACE_INSTRUMENT_DISABLE) ? Utils.getConfiguration(
                envVariableKeys.THUNDRA_LAMBDA_TRACE_INSTRUMENT_DISABLE) === 'true' : options.disableInstrumentation;

        this.maskRedisStatement = Utils.getConfiguration(
            envVariableKeys.THUNDRA_MASK_REDIS_STATEMENT) ? Utils.getConfiguration(
                envVariableKeys.THUNDRA_MASK_REDIS_STATEMENT) === 'true' : options.maskRedisStatement;

        this.maskRdbStatement = Utils.getConfiguration(
            envVariableKeys.THUNDRA_MASK_RDB_STATEMENT) ? Utils.getConfiguration(
                envVariableKeys.THUNDRA_MASK_RDB_STATEMENT) === 'true' : options.maskRdbStatement;

        this.maskDynamoDBStatement = Utils.getConfiguration(
            envVariableKeys.THUNDRA_MASK_DYNAMODB_STATEMENT) ? Utils.getConfiguration(
                envVariableKeys.THUNDRA_MASK_DYNAMODB_STATEMENT) === 'true' : options.maskDynamoDBStatement;

        this.maskElasticSearchStatement = Utils.getConfiguration(
            envVariableKeys.THUNDRA_MASK_ELASTIC_STATEMENT) ? Utils.getConfiguration(
                envVariableKeys.THUNDRA_MASK_ELASTIC_STATEMENT) === 'true' : options.maskElasticSearchStatement;

        this.maskMongoDBCommand = Utils.getConfiguration(
            envVariableKeys.THUNDRA_MASK_MONGODB_COMMAND) ? Utils.getConfiguration(
                envVariableKeys.THUNDRA_MASK_MONGODB_COMMAND) === 'true' : options.maskMongoDBCommand;

        this.dynamoDBTraceInjectionEnabled = Utils.getConfiguration(
            envVariableKeys.ENABLE_DYNAMODB_TRACE_INJECTION) ? Utils.getConfiguration(
                envVariableKeys.ENABLE_DYNAMODB_TRACE_INJECTION) === 'true' : options.dynamoDBTraceInjectionEnabled;

        this.enableCloudWatchRequest = Utils.getConfiguration(
            envVariableKeys.THUNDRA_LAMBDA_TRACE_CLOUDWATCHLOG_REQUEST_ENABLE) ? Utils.getConfiguration(
                envVariableKeys.THUNDRA_LAMBDA_TRACE_CLOUDWATCHLOG_REQUEST_ENABLE) === 'true' : options.enableCloudWatchRequest;

        this.enableFirehoseRequest = Utils.getConfiguration(
            envVariableKeys.THUNDRA_LAMBDA_TRACE_FIREHOSE_REQUEST_ENABLE) ? Utils.getConfiguration(
                envVariableKeys.THUNDRA_LAMBDA_TRACE_FIREHOSE_REQUEST_ENABLE) === 'true' : options.enableFirehoseRequest;

        this.enableKinesisRequest = Utils.getConfiguration(
            envVariableKeys.THUNDRA_LAMBDA_TRACE_KINESIS_REQUEST_ENABLE) ? Utils.getConfiguration(
                envVariableKeys.THUNDRA_LAMBDA_TRACE_KINESIS_REQUEST_ENABLE) === 'true' : options.enableKinesisRequest;

        this.maskSNSMessage = Utils.getConfiguration(
            envVariableKeys.THUNDRA_MASK_SNS_MESSAGE) ? Utils.getConfiguration(
                envVariableKeys.THUNDRA_MASK_SNS_MESSAGE) === 'true' : options.maskSNSMessage;

        this.maskSQSMessage = Utils.getConfiguration(
            envVariableKeys.THUNDRA_MASK_SQS_MESSAGE) ? Utils.getConfiguration(
                envVariableKeys.THUNDRA_MASK_SQS_MESSAGE) === 'true' : options.maskSQSMessage;

        this.maskAthenaStatement = Utils.getConfiguration(
            envVariableKeys.THUNDRA_MASK_ATHENA_STATEMENT) ? Utils.getConfiguration(
                envVariableKeys.THUNDRA_MASK_ATHENA_STATEMENT) === 'true' : options.maskAthenaStatement;

        this.maskLambdaPayload = Utils.getConfiguration(
            envVariableKeys.THUNDRA_MASK_LAMBDA_PAYLOAD) ? Utils.getConfiguration(
                envVariableKeys.THUNDRA_MASK_LAMBDA_PAYLOAD) === 'true' : options.maskLambdaPayload;

        this.maskHttpBody = Utils.getConfiguration(
            envVariableKeys.THUNDRA_MASK_HTTP_BODY) ? Utils.getConfiguration(
                envVariableKeys.THUNDRA_MASK_HTTP_BODY) === 'true' : options.maskHttpBody;

        this.runSamplerOnEachSpan = koalas(options.runCustomSamplerOnEachSpan, false);
        this.sampler = options.sampler;

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
                            const instance = new clazz(this);
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
        const idx1 = value.indexOf('[');
        const idx2 = value.indexOf(']');
        const args = value.substring(idx1 + 1, idx2).split(',');
        const pattern = idx1 < 0 ? value : value.substring(0, idx1);
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
