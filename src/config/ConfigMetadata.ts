/**
 * Provides metadata for configurations like type, default value, etc ...
 */

import ConfigNames from './ConfigNames';

export const ConfigMetadata: {[key: string]: { type: string, defaultValue?: any }} = {
    [ConfigNames.THUNDRA_APIKEY]: {
        type: 'string',
    },
    [ConfigNames.THUNDRA_DEBUG_ENABLE]: {
        type: 'boolean',
        defaultValue: false,
    },
    [ConfigNames.THUNDRA_DISABLE]: {
        type: 'boolean',
        defaultValue: false,
    },
    [ConfigNames.THUNDRA_TRACE_DISABLE]: {
        type: 'boolean',
        defaultValue: false,
    },
    [ConfigNames.THUNDRA_METRIC_DISABLE]: {
        type: 'boolean',
        defaultValue: true,
    },
    [ConfigNames.THUNDRA_LOG_DISABLE]: {
        type: 'boolean',
        defaultValue: true,
    },
    [ConfigNames.THUNDRA_APPLICATION_ID]: {
        type: 'string',
    },
    [ConfigNames.THUNDRA_APPLICATION_REGION]: {
        type: 'string',
    },
    [ConfigNames.THUNDRA_APPLICATION_INSTANCE_ID]: {
        type: 'string',
    },
    [ConfigNames.THUNDRA_APPLICATION_NAME]: {
        type: 'string',
    },
    [ConfigNames.THUNDRA_APPLICATION_STAGE]: {
        type: 'string',
    },
    [ConfigNames.THUNDRA_APPLICATION_DOMAIN_NAME]: {
        type: 'string',
        defaultValue: 'API',
    },
    [ConfigNames.THUNDRA_APPLICATION_CLASS_NAME]: {
        type: 'string',
        defaultValue: 'AWS-Lambda',
    },
    [ConfigNames.THUNDRA_APPLICATION_VERSION]: {
        type: 'string',
    },
    [ConfigNames.THUNDRA_APPLICATION_TAG_PREFIX]: {
        type: 'any',
    },
    [ConfigNames.THUNDRA_REPORT_REST_BASEURL]: {
        type: 'string',
        defaultValue: 'https://collector.thundra.io/v1',
    },
    [ConfigNames.THUNDRA_REPORT_REST_TRUSTALLCERTIFICATES]: {
        type: 'boolean',
        defaultValue: false,
    },
    [ConfigNames.THUNDRA_REPORT_CLOUDWATCH_ENABLE]: {
        type: 'boolean',
        defaultValue: false,
    },
    [ConfigNames.THUNDRA_REPORT_MAX_SIZE]: {
        type: 'number',
        defaultValue: 32 * 1024, // 32 KB
    },
    [ConfigNames.THUNDRA_LAMBDA_HANDLER]: {
        type: 'string',
    },
    [ConfigNames.THUNDRA_LAMBDA_WARMUP_WARMUPAWARE]: {
        type: 'boolean',
        defaultValue: false,
    },
    [ConfigNames.THUNDRA_LAMBDA_TIMEOUT_MARGIN]: {
        type: 'number',
    },
    [ConfigNames.THUNDRA_LAMBDA_ERROR_STACKTRACE_MASK]: {
        type: 'boolean',
        defaultValue: false,
    },
    [ConfigNames.THUNDRA_LAMBDA_TRACE_REQUEST_SKIP]: {
        type: 'boolean',
        defaultValue: false,
    },
    [ConfigNames.THUNDRA_LAMBDA_TRACE_RESPONSE_SKIP]: {
        type: 'boolean',
        defaultValue: false,
    },
    [ConfigNames.THUNDRA_LAMBDA_TRACE_KINESIS_REQUEST_ENABLE]: {
        type: 'boolean',
        defaultValue: false,
    },
    [ConfigNames.THUNDRA_LAMBDA_TRACE_FIREHOSE_REQUEST_ENABLE]: {
        type: 'boolean',
        defaultValue: false,
    },
    [ConfigNames.THUNDRA_LAMBDA_TRACE_CLOUDWATCHLOG_REQUEST_ENABLE]: {
        type: 'boolean',
        defaultValue: false,
    },
    [ConfigNames.THUNDRA_TRACE_INSTRUMENT_DISABLE]: {
        type: 'boolean',
        defaultValue: false,
    },
    [ConfigNames.THUNDRA_TRACE_INSTRUMENT_TRACEABLECONFIG]: {
        type: 'string',
    },
    [ConfigNames.THUNDRA_TRACE_INSTRUMENT_FILE_PREFIX]: {
        type: 'string',
    },
    [ConfigNames.THUNDRA_TRACE_SPAN_LISTENERCONFIG]: {
        type: 'string',
    },
    [ConfigNames.THUNDRA_SAMPLER_TIMEAWARE_TIMEFREQ]: {
        type: 'number',
        defaultValue: 300000,
    },
    [ConfigNames.THUNDRA_SAMPLER_COUNTAWARE_COUNTFREQ]: {
        type: 'number',
        defaultValue: 100,
    },
    [ConfigNames.THUNDRA_TRACE_INTEGRATIONS_DISABLE]: {
        type: 'string',
        defaultValue: false,
    },
    [ConfigNames.THUNDRA_TRACE_INTEGRATIONS_AWS_INSTRUMENT_ON_LOAD]: {
        type: 'boolean',
        defaultValue: false,
    },
    [ConfigNames.THUNDRA_TRACE_INTEGRATIONS_AWS_SNS_MESSAGE_MASK]: {
        type: 'boolean',
        defaultValue: false,
    },
    [ConfigNames.THUNDRA_TRACE_INTEGRATIONS_AWS_SNS_TRACEINJECTION_DISABLE]: {
        type: 'boolean',
        defaultValue: false,
    },
    [ConfigNames.THUNDRA_TRACE_INTEGRATIONS_AWS_SQS_MESSAGE_MASK]: {
        type: 'boolean',
        defaultValue: false,
    },
    [ConfigNames.THUNDRA_TRACE_INTEGRATIONS_AWS_SQS_TRACEINJECTION_DISABLE]: {
        type: 'boolean',
        defaultValue: false,
    },
    [ConfigNames.THUNDRA_TRACE_INTEGRATIONS_AWS_LAMBDA_PAYLOAD_MASK]: {
        type: 'boolean',
        defaultValue: false,
    },
    [ConfigNames.THUNDRA_TRACE_INTEGRATIONS_AWS_LAMBDA_TRACEINJECTION_DISABLE]: {
        type: 'boolean',
        defaultValue: false,
    },
    [ConfigNames.THUNDRA_TRACE_INTEGRATIONS_AWS_DYNAMODB_STATEMENT_MASK]: {
        type: 'boolean',
        defaultValue: false,
    },
    [ConfigNames.THUNDRA_TRACE_INTEGRATIONS_AWS_DYNAMODB_TRACEINJECTION_ENABLE]: {
        type: 'boolean',
        defaultValue: false,
    },
    [ConfigNames.THUNDRA_TRACE_INTEGRATIONS_AWS_ATHENA_STATEMENT_MASK]: {
        type: 'boolean',
        defaultValue: false,
    },
    [ConfigNames.THUNDRA_LAMBDA_AWS_STEPFUNCTIONS]: {
        type: 'boolean',
        defaultValue: false,
    },
    [ConfigNames.THUNDRA_TRACE_INTEGRATIONS_HTTP_BODY_MASK]: {
        type: 'boolean',
        defaultValue: false,
    },
    [ConfigNames.THUNDRA_TRACE_INTEGRATIONS_HTTP_URL_DEPTH]: {
        type: 'number',
        defaultValue: 1,
    },
    [ConfigNames.THUNDRA_TRACE_INTEGRATIONS_HTTP_TRACEINJECTION_DISABLE]: {
        type: 'boolean',
        defaultValue: false,
    },
    [ConfigNames.THUNDRA_TRACE_INTEGRATIONS_HTTP_ERROR_ON_4XX_DISABLE]: {
        type: 'boolean',
        defaultValue: false,
    },
    [ConfigNames.THUNDRA_TRACE_INTEGRATIONS_HTTP_ERROR_ON_5XX_DISABLE]: {
        type: 'boolean',
        defaultValue: false,
    },
    [ConfigNames.THUNDRA_TRACE_INTEGRATIONS_REDIS_COMMAND_MASK]: {
        type: 'boolean',
        defaultValue: false,
    },
    [ConfigNames.THUNDRA_TRACE_INTEGRATIONS_RDB_STATEMENT_MASK]: {
        type: 'boolean',
        defaultValue: false,
    },
    [ConfigNames.THUNDRA_TRACE_INTEGRATIONS_ELASTICSEARCH_BODY_MASK]: {
        type: 'boolean',
        defaultValue: false,
    },
    [ConfigNames.THUNDRA_TRACE_INTEGRATIONS_ELASTICSEARCH_PATH_DEPTH]: {
        type: 'number',
        defaultValue: 1,
    },
    [ConfigNames.THUNDRA_TRACE_INTEGRATIONS_MONGODB_COMMAND_MASK]: {
        type: 'boolean',
        defaultValue: false,
    },
    [ConfigNames.THUNDRA_TRACE_INTEGRATIONS_EVENTBRIDGE_DETAIL_MASK]: {
        type: 'boolean',
        defaultValue: false,
    },
    [ConfigNames.THUNDRA_TRACE_INTEGRATIONS_AWS_SES_MAIL_MASK]: {
        type: 'boolean',
        defaultValue: true,
    },
    [ConfigNames.THUNDRA_TRACE_INTEGRATIONS_AWS_SES_MAIL_DESTINATION_MASK]: {
        type: 'boolean',
        defaultValue: false,
    },
    [ConfigNames.THUNDRA_LOG_CONSOLE_DISABLE]: {
        type: 'boolean',
        defaultValue: false,
    },
    [ConfigNames.THUNDRA_LOG_LOGLEVEL]: {
        type: 'string',
        defaultValue: 'TRACE',
    },
    [ConfigNames.THUNDRA_LAMBDA_DEBUGGER_ENABLE]: {
        type: 'boolean',
        defaultValue: false,
    },
    [ConfigNames.THUNDRA_LAMBDA_DEBUGGER_PORT]: {
        type: 'number',
        defaultValue: 1111,
    },
    [ConfigNames.THUNDRA_LAMBDA_DEBUGGER_LOGS_ENABLE]: {
        type: 'boolean',
        defaultValue: false,
    },
    [ConfigNames.THUNDRA_LAMBDA_DEBUGGER_WAIT_MAX]: {
        type: 'number',
        defaultValue: 60000,
    },
    [ConfigNames.THUNDRA_LAMBDA_DEBUGGER_IO_WAIT]: {
        type: 'number',
        defaultValue: 2000,
    },
    [ConfigNames.THUNDRA_LAMBDA_DEBUGGER_BROKER_PORT]: {
        type: 'number',
        defaultValue: 444,
    },
    [ConfigNames.THUNDRA_LAMBDA_DEBUGGER_BROKER_HOST]: {
        type: 'string',
        defaultValue: 'debug.thundra.io',
    },
    [ConfigNames.THUNDRA_LAMBDA_DEBUGGER_SESSION_NAME]: {
        type: 'string',
        defaultValue: 'default',
    },
    [ConfigNames.THUNDRA_LAMBDA_DEBUGGER_AUTH_TOKEN]: {
        type: 'string',
    },
};

export default ConfigMetadata;
