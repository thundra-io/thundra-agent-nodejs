import BasePluginConfig from './BasePluginConfig';
import { TraceableConfig } from '@thundra/instrumenter';
import IntegrationConfig from './IntegrationConfig';
import ConfigProvider from '../../config/ConfigProvider';
import ConfigNames from '../../config/ConfigNames';
import ThundraLogger from '../../ThundraLogger';
import Integration from '../integrations/Integration';
import Instrumenter from '../../opentracing/instrument/Instrumenter';
import Sampler from '../../opentracing/sampler/Sampler';
import ThundraTracer from '../../opentracing/Tracer';
const get = require('lodash.get');

class TraceConfig extends BasePluginConfig {

    disableRequest: boolean;
    disableResponse: boolean;
    tracerConfig: any;
    traceableConfigs: TraceableConfig[];
    maskRequest: (request: any) => any;
    maskResponse: (response: any) => any;
    disabledIntegrations: IntegrationConfig[];
    disableInstrumentation: boolean;
    disableHttp4xxError: boolean;
    disableHttp5xxError: boolean;
    integrationsMap: Map<string, Integration>;
    instrumenter: Instrumenter;
    maskRedisStatement: boolean;
    maskRdbStatement: boolean;
    maskDynamoDBStatement: boolean;
    maskElasticSearchStatement: boolean;
    maskMongoDBCommand: boolean;
    dynamoDBTraceInjectionEnabled: boolean;
    httpPathDepth: number;
    esPathDepth: number;
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
    instrumentAWSOnLoad: boolean;
    tracer: ThundraTracer;

    constructor(options: any) {
        options = options ? options : {};
        super(get(options, 'enabled', true));
        this.disableRequest = ConfigProvider.getBoolean(
            ConfigNames.THUNDRA_LAMBDA_TRACE_REQUEST_SKIP,
            options.disableRequest);
        this.disableResponse = ConfigProvider.getBoolean(
            ConfigNames.THUNDRA_LAMBDA_TRACE_RESPONSE_SKIP,
            options.disableResponse);
        this.maskRequest = options.maskRequest;
        this.maskResponse = options.maskResponse;
        this.disabledIntegrations = [];
        this.tracerConfig = get(options, 'tracerConfig', {});
        this.traceableConfigs = [];

        this.disableInstrumentation = ConfigProvider.getBoolean(
            ConfigNames.THUNDRA_TRACE_INSTRUMENT_DISABLE,
            options.disableInstrumentation);

        this.maskRedisStatement = ConfigProvider.getBoolean(
            ConfigNames.THUNDRA_TRACE_INTEGRATIONS_REDIS_COMMAND_MASK,
            options.maskRedisStatement);
        this.maskRdbStatement = ConfigProvider.getBoolean(
            ConfigNames.THUNDRA_TRACE_INTEGRATIONS_RDB_STATEMENT_MASK,
            options.maskRdbStatement);
        this.maskDynamoDBStatement = ConfigProvider.getBoolean(
            ConfigNames.THUNDRA_TRACE_INTEGRATIONS_AWS_DYNAMODB_STATEMENT_MASK,
            options.maskDynamoDBStatement);
        this.maskSQSMessage = ConfigProvider.getBoolean(
            ConfigNames.THUNDRA_TRACE_INTEGRATIONS_AWS_SQS_MESSAGE_MASK,
            options.maskSQSMessage);
        this.maskSNSMessage = ConfigProvider.getBoolean(
            ConfigNames.THUNDRA_TRACE_INTEGRATIONS_AWS_SNS_MESSAGE_MASK,
            options.maskSNSMessage);
        this.maskLambdaPayload = ConfigProvider.getBoolean(
            ConfigNames.THUNDRA_TRACE_INTEGRATIONS_AWS_LAMBDA_PAYLOAD_MASK,
            options.maskLambdaPayload);
        this.maskAthenaStatement = ConfigProvider.getBoolean(
            ConfigNames.THUNDRA_TRACE_INTEGRATIONS_AWS_ATHENA_STATEMENT_MASK,
            options.maskAthenaStatement);
        this.maskElasticSearchStatement = ConfigProvider.getBoolean(
            ConfigNames.THUNDRA_TRACE_INTEGRATIONS_ELASTICSEARCH_BODY_MASK,
            options.maskElasticSearchStatement);
        this.maskMongoDBCommand = ConfigProvider.getBoolean(
            ConfigNames.THUNDRA_TRACE_INTEGRATIONS_MONGODB_COMMAND_MASK,
            options.maskMongoDBCommand);
        this.maskHttpBody = ConfigProvider.getBoolean(
            ConfigNames.THUNDRA_TRACE_INTEGRATIONS_HTTP_BODY_MASK,
            options.maskHttpBody);

        this.disableHttp4xxError = ConfigProvider.getBoolean(
            ConfigNames.THUNDRA_TRACE_INTEGRATIONS_HTTP_ERROR_ON_4XX_DISABLE,
            options.disableHttp4xxError);
        this.disableHttp5xxError = ConfigProvider.getBoolean(
            ConfigNames.THUNDRA_TRACE_INTEGRATIONS_HTTP_ERROR_ON_5XX_DISABLE,
            options.disableHttp5xxError);

        this.dynamoDBTraceInjectionEnabled = ConfigProvider.getBoolean(
            ConfigNames.THUNDRA_TRACE_INTEGRATIONS_AWS_DYNAMODB_TRACEINJECTION_ENABLE,
            options.dynamoDBTraceInjectionEnabled);

        this.enableCloudWatchRequest = ConfigProvider.getBoolean(
            ConfigNames.THUNDRA_LAMBDA_TRACE_CLOUDWATCHLOG_REQUEST_ENABLE,
            options.enableCloudWatchRequest);
        this.enableFirehoseRequest = ConfigProvider.getBoolean(
            ConfigNames.THUNDRA_LAMBDA_TRACE_FIREHOSE_REQUEST_ENABLE,
            options.enableFirehoseRequest);
        this.enableKinesisRequest = ConfigProvider.getBoolean(
            ConfigNames.THUNDRA_LAMBDA_TRACE_KINESIS_REQUEST_ENABLE,
            options.enableKinesisRequest);

        this.instrumentAWSOnLoad = ConfigProvider.getBoolean(
            ConfigNames.THUNDRA_TRACE_INTEGRATIONS_AWS_INSTRUMENT_ON_LOAD,
            options.instrumentAWSOnLoad);

        this.httpPathDepth = ConfigProvider.getNumber(
            ConfigNames.THUNDRA_TRACE_INTEGRATIONS_HTTP_URL_DEPTH,
            1);
        this.esPathDepth = ConfigProvider.getNumber(
            ConfigNames.THUNDRA_TRACE_INTEGRATIONS_ELASTICSEARCH_PATH_DEPTH,
            1);

        this.runSamplerOnEachSpan = get(options, 'runCustomSamplerOnEachSpan', false);
        this.sampler = options.sampler;

        for (const configName of ConfigProvider.names()) {
            if (configName.startsWith(ConfigNames.THUNDRA_TRACE_INSTRUMENT_CONFIG)) {
                try {
                    this.traceableConfigs.push(TraceableConfig.fromString(ConfigProvider.get(configName)));
                } catch (ex) {
                    ThundraLogger.getInstance().error(`Cannot parse trace def ${configName}`);
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

        const disabledIntegrations = ConfigProvider.get(ConfigNames.THUNDRA_LAMBDA_TRACE_INTEGRATIONS_DISABLE);
        if (disabledIntegrations) {
            this.disabledIntegrations.push(... this.parseIntegrationsConfig(disabledIntegrations));
        }
        if (options.disabledIntegrations) {
            for (const intgr of options.disabledIntegrations) {
                if (typeof intgr === 'string') {
                    this.disabledIntegrations.push(new IntegrationConfig(intgr, {}));
                } else {
                    this.disabledIntegrations.push(new IntegrationConfig(intgr.name, intgr.opt));
                }
            }
        }

        if (options.tracer) {
            this.tracer = options.tracer;
        }
    }

    parseIntegrationsConfig(value: string): IntegrationConfig[] {
        const args = value.split(',');
        const configs: IntegrationConfig[] = [];
        for (const arg of args) {
            configs.push(new IntegrationConfig(arg.trim(), {enabled: false}));
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

    updateConfig(options: any) {
        this.maskRequest = get(options, 'traceConfig.maskRequest', this.maskRequest);
        this.maskResponse = get(options, 'traceConfig.maskResponse', this.maskResponse);
        this.runSamplerOnEachSpan = get(options, 'traceConfig.runCustomSamplerOnEachSpan', this.runSamplerOnEachSpan);
        this.sampler = get(options, 'traceConfig.sampler', this.sampler);
    }

}

export default TraceConfig;
