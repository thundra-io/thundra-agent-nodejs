import BasePluginConfig from './BasePluginConfig';
import { TraceableConfig } from '@thundra/instrumenter';
import IntegrationConfig from './IntegrationConfig';
import ConfigProvider from '../../config/ConfigProvider';
import ConfigNames from '../../config/ConfigNames';
import ThundraLogger from '../../ThundraLogger';
import Integration from '../../integrations/Integration';
import Instrumenter from '../../opentracing/instrument/Instrumenter';
import Sampler from '../../samplers/Sampler';
import ThundraTracer from '../../opentracing/Tracer';
const get = require('lodash.get');

/**
 * Configures trace plugin/support
 */
class TraceConfig extends BasePluginConfig {

    disableRequest: boolean;
    disableResponse: boolean;
    tracerConfig: any;
    traceableConfigs: TraceableConfig[];
    maxSpanCount: number;
    maskRequest: (request: any) => any;
    maskResponse: (response: any) => any;
    disabledIntegrations: IntegrationConfig[];
    disableInstrumentation: boolean;
    disableHttp4xxError: boolean;
    disableHttp5xxError: boolean;
    instrumenter: Instrumenter;
    maskRedisCommand: boolean;
    maskRdbStatement: boolean;
    maskRdbResult: boolean;
    maskDynamoDBStatement: boolean;
    maskElasticSearchBody: boolean;
    maskRabbitmqMessage: boolean;
    maskMongoDBCommand: boolean;
    dynamoDBTraceInjectionEnabled: boolean;
    lambdaTraceInjectionDisabled: boolean;
    sqsTraceInjectionDisabled: boolean;
    snsTraceInjectionDisabled: boolean;
    httpTraceInjectionDisabled: boolean;
    httpPathDepth: number;
    esPathDepth: number;
    enableCloudWatchRequest: boolean;
    enableFirehoseRequest: boolean;
    enableKinesisRequest: boolean;
    maskSNSMessage: boolean;
    maskSQSMessage: boolean;
    maskAthenaStatement: boolean;
    maskLambdaPayload: boolean;
    maskEventBridgeDetail: boolean;
    maskHttpBody: boolean;
    maxHttpBodySize: number;
    maskHttpResponseBody: boolean;
    maxHttpResponseBodySize: number;
    maskGooglePubSubMessage: boolean;
    sampler: Sampler<any>;
    runSamplerOnEachSpan: boolean;
    instrumentAWSOnLoad: boolean;
    tracer: ThundraTracer;
    hapiTraceDisabled: boolean;
    koaTraceDisabled: boolean;
    googlePubSubTraceDisabled: boolean;

    constructor(options: any) {
        options = options ? options : {};
        super(get(options, 'enabled', true));
        this.disableRequest = ConfigProvider.get<boolean>(
            ConfigNames.THUNDRA_TRACE_REQUEST_SKIP,
            options.disableRequest);
        this.disableResponse = ConfigProvider.get<boolean>(
            ConfigNames.THUNDRA_TRACE_RESPONSE_SKIP,
            options.disableResponse);
        this.maskRequest = options.maskRequest;
        this.maskResponse = options.maskResponse;
        this.disabledIntegrations = [];
        this.tracerConfig = get(options, 'tracerConfig', {});
        this.traceableConfigs = [];

        this.maxSpanCount = ConfigProvider.get<number>(
            ConfigNames.THUNDRA_TRACE_SPAN_COUNT_MAX,
            options.maxSpanCount);

        this.disableInstrumentation = ConfigProvider.get<boolean>(
            ConfigNames.THUNDRA_TRACE_INSTRUMENT_DISABLE,
            options.disableInstrumentation);

        this.maskRedisCommand = ConfigProvider.get<boolean>(
            ConfigNames.THUNDRA_TRACE_INTEGRATIONS_REDIS_COMMAND_MASK,
            options.maskRedisCommand);
        this.maskRdbStatement = ConfigProvider.get<boolean>(
            ConfigNames.THUNDRA_TRACE_INTEGRATIONS_RDB_STATEMENT_MASK,
            options.maskRdbStatement);
        this.maskRdbResult = ConfigProvider.get<boolean>(
            ConfigNames.THUNDRA_TRACE_INTEGRATIONS_RDB_RESULT_MASK,
            options.maskRdbResult);
        this.maskDynamoDBStatement = ConfigProvider.get<boolean>(
            ConfigNames.THUNDRA_TRACE_INTEGRATIONS_AWS_DYNAMODB_STATEMENT_MASK,
            options.maskDynamoDBStatement);
        this.maskSQSMessage = ConfigProvider.get<boolean>(
            ConfigNames.THUNDRA_TRACE_INTEGRATIONS_AWS_SQS_MESSAGE_MASK,
            options.maskSQSMessage);
        this.maskSNSMessage = ConfigProvider.get<boolean>(
            ConfigNames.THUNDRA_TRACE_INTEGRATIONS_AWS_SNS_MESSAGE_MASK,
            options.maskSNSMessage);
        this.maskLambdaPayload = ConfigProvider.get<boolean>(
            ConfigNames.THUNDRA_TRACE_INTEGRATIONS_AWS_LAMBDA_PAYLOAD_MASK,
            options.maskLambdaPayload);
        this.maskAthenaStatement = ConfigProvider.get<boolean>(
            ConfigNames.THUNDRA_TRACE_INTEGRATIONS_AWS_ATHENA_STATEMENT_MASK,
            options.maskAthenaStatement);
        this.maskElasticSearchBody = ConfigProvider.get<boolean>(
            ConfigNames.THUNDRA_TRACE_INTEGRATIONS_ELASTICSEARCH_BODY_MASK,
            options.maskElasticSearchBody);
        this.maskRabbitmqMessage = ConfigProvider.get<boolean>(
            ConfigNames.THUNDRA_TRACE_INTEGRATIONS_RABBITMQ_MESSAGE_MASK,
            options.maskRabbitmqMessage);
        this.maskMongoDBCommand = ConfigProvider.get<boolean>(
            ConfigNames.THUNDRA_TRACE_INTEGRATIONS_MONGODB_COMMAND_MASK,
            options.maskMongoDBCommand);
        this.maskHttpBody = ConfigProvider.get<boolean>(
            ConfigNames.THUNDRA_TRACE_INTEGRATIONS_HTTP_BODY_MASK,
            options.maskHttpBody);
        this.maxHttpBodySize = ConfigProvider.get<number>(
            ConfigNames.THUNDRA_TRACE_INTEGRATIONS_HTTP_BODY_SIZE_MAX,
            options.maxHttpBodySize);
        this.maskHttpResponseBody = ConfigProvider.get<boolean>(
            ConfigNames.THUNDRA_TRACE_INTEGRATIONS_HTTP_RESPONSE_BODY_MASK,
            options.maskHttpResponseBody);
        this.maxHttpResponseBodySize = ConfigProvider.get<number>(
            ConfigNames.THUNDRA_TRACE_INTEGRATIONS_HTTP_RESPONSE_BODY_SIZE_MAX,
            options.maxHttpResponseBodySize);
        this.maskEventBridgeDetail = ConfigProvider.get<boolean>(
            ConfigNames.THUNDRA_TRACE_INTEGRATIONS_EVENTBRIDGE_DETAIL_MASK,
            options.maskEventBridgeDetail);
        this.maskGooglePubSubMessage = ConfigProvider.get<boolean>(
            ConfigNames.THUNDRA_TRACE_INTEGRATIONS_GOOGLE_PUBSUB_MESSAGE_MASK,
            options.maskGooglePubSubMessage);

        this.disableHttp4xxError = ConfigProvider.get<boolean>(
            ConfigNames.THUNDRA_TRACE_INTEGRATIONS_HTTP_ERROR_ON_4XX_DISABLE,
            options.disableHttp4xxError);
        this.disableHttp5xxError = ConfigProvider.get<boolean>(
            ConfigNames.THUNDRA_TRACE_INTEGRATIONS_HTTP_ERROR_ON_5XX_DISABLE,
            options.disableHttp5xxError);

        this.dynamoDBTraceInjectionEnabled = ConfigProvider.get<boolean>(
            ConfigNames.THUNDRA_TRACE_INTEGRATIONS_AWS_DYNAMODB_TRACEINJECTION_ENABLE,
            options.dynamoDBTraceInjectionEnabled);
        this.lambdaTraceInjectionDisabled = ConfigProvider.get<boolean>(
            ConfigNames.THUNDRA_TRACE_INTEGRATIONS_AWS_LAMBDA_TRACEINJECTION_DISABLE,
            options.lambdaTraceInjectionDisabled);
        this.sqsTraceInjectionDisabled = ConfigProvider.get<boolean>(
            ConfigNames.THUNDRA_TRACE_INTEGRATIONS_AWS_SQS_TRACEINJECTION_DISABLE,
            options.sqsTraceInjectionDisabled);
        this.snsTraceInjectionDisabled = ConfigProvider.get<boolean>(
            ConfigNames.THUNDRA_TRACE_INTEGRATIONS_AWS_SNS_TRACEINJECTION_DISABLE,
            options.snsTraceInjectionDisabled);
        this.httpTraceInjectionDisabled = ConfigProvider.get<boolean>(
            ConfigNames.THUNDRA_TRACE_INTEGRATIONS_HTTP_TRACEINJECTION_DISABLE,
            options.httpTraceInjectionDisabled);

        this.enableCloudWatchRequest = ConfigProvider.get<boolean>(
            ConfigNames.THUNDRA_LAMBDA_TRACE_CLOUDWATCHLOG_REQUEST_ENABLE,
            options.enableCloudWatchRequest);
        this.enableFirehoseRequest = ConfigProvider.get<boolean>(
            ConfigNames.THUNDRA_LAMBDA_TRACE_FIREHOSE_REQUEST_ENABLE,
            options.enableFirehoseRequest);
        this.enableKinesisRequest = ConfigProvider.get<boolean>(
            ConfigNames.THUNDRA_LAMBDA_TRACE_KINESIS_REQUEST_ENABLE,
            options.enableKinesisRequest);

        this.instrumentAWSOnLoad = ConfigProvider.get<boolean>(
            ConfigNames.THUNDRA_TRACE_INTEGRATIONS_AWS_INSTRUMENT_ON_LOAD,
            options.instrumentAWSOnLoad);

        this.httpPathDepth = ConfigProvider.get<number>(ConfigNames.THUNDRA_TRACE_INTEGRATIONS_HTTP_URL_DEPTH);
        this.esPathDepth = ConfigProvider.get<number>(ConfigNames.THUNDRA_TRACE_INTEGRATIONS_ELASTICSEARCH_PATH_DEPTH);

        this.runSamplerOnEachSpan = get(options, 'runCustomSamplerOnEachSpan', false);
        this.sampler = options.sampler;

        this.hapiTraceDisabled = ConfigProvider.get<boolean>(
            ConfigNames.THUNDRA_TRACE_INTEGRATIONS_HAPI_DISABLE,
            options.hapiTraceDisabled);
        this.koaTraceDisabled = ConfigProvider.get<boolean>(
            ConfigNames.THUNDRA_TRACE_INTEGRATIONS_KOA_DISABLE,
            options.koaTraceDisabled);
        this.googlePubSubTraceDisabled = ConfigProvider.get<boolean>(
            ConfigNames.THUNDRA_TRACE_INTEGRATIONS_GOOGLE_PUBSUB_DISABLE,
            options.googlePubSubTraceDisabled);

        for (const configName of ConfigProvider.names()) {
            if (configName.startsWith(ConfigNames.THUNDRA_TRACE_INSTRUMENT_TRACEABLECONFIG)) {
                try {
                    this.traceableConfigs.push(TraceableConfig.fromString(ConfigProvider.get<string>(configName)));
                } catch (e) {
                    ThundraLogger.error(`<TraceConfig> Cannot parse trace definition ${configName}:`, e);
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

        const disabledIntegrations = ConfigProvider.get<string>(ConfigNames.THUNDRA_TRACE_INTEGRATIONS_DISABLE);
        if (disabledIntegrations) {
            this.disabledIntegrations.push(... this.parseIntegrationsConfig(disabledIntegrations));
        }
        if (options.disabledIntegrations) {
            for (const intgr of options.disabledIntegrations) {
                if (typeof intgr === 'string') {
                    this.disabledIntegrations.push(new IntegrationConfig(intgr, {enabled: false}));
                } else {
                    this.disabledIntegrations.push(new IntegrationConfig(intgr.name, intgr.opt));
                }
            }
        }

        if (options.tracer) {
            this.tracer = options.tracer;
        }
    }

    /**
     * Checks whether given integration is disabled
     * @param {string} name the integration name
     * @return {boolean} {@code true} if integration is disabled, {@code false} otherwise
     */
    isIntegrationDisabled(name: string) {
        let disabled = false;
        for (const config of this.disabledIntegrations) {
            if (config.name === name && !config.enabled) {
                disabled = true;
            }
        }
        return disabled;
    }

    /**
     * Updates configuration by options
     * @param options the options to update configuration
     */
    updateConfig(options: any) {
        this.maskRequest = get(options, 'traceConfig.maskRequest', this.maskRequest);
        this.maskResponse = get(options, 'traceConfig.maskResponse', this.maskResponse);
        this.runSamplerOnEachSpan = get(options, 'traceConfig.runCustomSamplerOnEachSpan', this.runSamplerOnEachSpan);
        this.sampler = get(options, 'traceConfig.sampler', this.sampler);
    }

    private parseIntegrationsConfig(value: string): IntegrationConfig[] {
        const args = value.split(',');
        const configs: IntegrationConfig[] = [];
        for (const arg of args) {
            configs.push(new IntegrationConfig(arg.trim(), {enabled: false}));
        }
        return configs;
    }

}

export default TraceConfig;
