class ConfigNames {

    public static readonly THUNDRA_APIKEY: string =
        'thundra.apikey';

    public static readonly THUNDRA_DEBUG_ENABLE: string =
        'thundra.agent.debug.enable';

    /////////////////////////////////////////////////////////////////////////////

    public static readonly THUNDRA_DISABLE: string =
        'thundra.agent.disable';
    public static readonly THUNDRA_TRACE_DISABLE: string =
        'thundra.agent.trace.disable';
    public static readonly THUNDRA_METRIC_DISABLE: string =
        'thundra.agent.metric.disable';
    public static readonly THUNDRA_LOG_DISABLE: string =
        'thundra.agent.log.disable';

    /////////////////////////////////////////////////////////////////////////////

    public static readonly THUNDRA_APPLICATION_ID: string =
        'thundra.agent.application.id';
    public static readonly THUNDRA_APPLICATION_INSTANCE_ID: string =
        'thundra.agent.application.instanceid';
    public static readonly THUNDRA_APPLICATION_REGION: string =
        'thundra.agent.application.region';
    public static readonly THUNDRA_APPLICATION_NAME: string =
        'thundra.agent.application.name';
    public static readonly THUNDRA_APPLICATION_STAGE: string =
        'thundra.agent.application.stage';
    public static readonly THUNDRA_APPLICATION_DOMAIN_NAME: string =
        'thundra.agent.application.domainname';
    public static readonly THUNDRA_APPLICATION_CLASS_NAME: string =
        'thundra.agent.application.classname';
    public static readonly THUNDRA_APPLICATION_VERSION: string =
        'thundra.agent.application.version';
    public static readonly THUNDRA_APPLICATION_TAG_PREFIX: string =
        'thundra.agent.application.tag.';

    /////////////////////////////////////////////////////////////////////////////

    public static readonly THUNDRA_REPORT_REST_BASEURL: string =
        'thundra.agent.report.rest.baseurl';
    public static readonly THUNDRA_REPORT_REST_TRUSTALLCERTIFICATES: string =
        'thundra.agent.report.rest.trustallcertificates';
    public static readonly THUNDRA_REPORT_CLOUDWATCH_ENABLE: string =
        'thundra.agent.report.cloudwatch.enable';

    /////////////////////////////////////////////////////////////////////////////

    public static readonly THUNDRA_LAMBDA_HANDLER: string =
        'thundra.agent.lambda.handler';

    public static readonly THUNDRA_LAMBDA_WARMUP_WARMUPAWARE: string =
        'thundra.agent.lambda.warmup.warmupaware';

    public static readonly THUNDRA_LAMBDA_TIMEOUT_MARGIN: string =
        'thundra.agent.lambda.timeout.margin';

    public static readonly THUNDRA_LAMBDA_ERROR_STACKTRACE_MASK: string =
        'thundra.agent.lambda.error.stacktrace.mask';

    public static readonly THUNDRA_LAMBDA_TRACE_REQUEST_SKIP: string =
        'thundra.agent.lambda.trace.request.skip';
    public static readonly THUNDRA_LAMBDA_TRACE_RESPONSE_SKIP: string =
        'thundra.agent.lambda.trace.response.skip';
    public static readonly THUNDRA_LAMBDA_TRACE_KINESIS_REQUEST_ENABLE: string =
        'thundra.agent.lambda.trace.kinesis.request.enable';
    public static readonly THUNDRA_LAMBDA_TRACE_FIREHOSE_REQUEST_ENABLE: string =
        'thundra.agent.lambda.trace.firehose.request.enable';
    public static readonly THUNDRA_LAMBDA_TRACE_CLOUDWATCHLOG_REQUEST_ENABLE: string =
        'thundra.agent.lambda.trace.cloudwatchlog.request.enable';

    /////////////////////////////////////////////////////////////////////////////

    public static readonly THUNDRA_TRACE_INSTRUMENT_DISABLE: string =
        'thundra.agent.trace.instrument.disable';
    public static readonly THUNDRA_TRACE_INSTRUMENT_TRACEABLECONFIG: string =
        'thundra.agent.trace.instrument.traceableconfig';
    public static readonly THUNDRA_TRACE_INSTRUMENT_FILE_PREFIX: string =
        'thundra.agent.trace.instrument.file.prefix';

    /////////////////////////////////////////////////////////////////////////////

    public static readonly THUNDRA_TRACE_SPAN_LISTENERCONFIG: string =
        'thundra.agent.trace.span.listenerconfig';

    /////////////////////////////////////////////////////////////////////////////

    public static readonly THUNDRA_SAMPLER_TIMEAWARE_TIMEFREQ: string =
        'thundra.agent.sampler.timeaware.timefreq';
    public static readonly THUNDRA_SAMPLER_COUNTAWARE_COUNTFREQ: string =
        'thundra.agent.sampler.countaware.countfreq';

    /////////////////////////////////////////////////////////////////////////////

    public static readonly THUNDRA_TRACE_INTEGRATIONS_DISABLE: string =
        'thundra.agent.trace.integrations.disable';

    public static readonly THUNDRA_TRACE_INTEGRATIONS_AWS_INSTRUMENT_ON_LOAD: string =
        'thundra.agent.trace.integrations.aws.instrument.onload';

    public static readonly THUNDRA_TRACE_INTEGRATIONS_AWS_SNS_MESSAGE_MASK: string =
        'thundra.agent.trace.integrations.aws.sns.message.mask';
    public static readonly THUNDRA_TRACE_INTEGRATIONS_AWS_SNS_TRACEINJECTION_DISABLE: string =
        'thundra.agent.trace.integrations.aws.sns.traceinjection.disable';

    public static readonly THUNDRA_TRACE_INTEGRATIONS_AWS_SQS_MESSAGE_MASK: string =
        'thundra.agent.trace.integrations.aws.sqs.message.mask';
    public static readonly THUNDRA_TRACE_INTEGRATIONS_AWS_SQS_TRACEINJECTION_DISABLE: string =
        'thundra.agent.trace.integrations.aws.sqs.traceinjection.disable';

    public static readonly THUNDRA_TRACE_INTEGRATIONS_AWS_LAMBDA_PAYLOAD_MASK: string =
        'thundra.agent.trace.integrations.aws.lambda.payload.mask';
    public static readonly THUNDRA_TRACE_INTEGRATIONS_AWS_LAMBDA_TRACEINJECTION_DISABLE: string =
        'thundra.agent.trace.integrations.aws.lambda.traceinjection.disable';

    public static readonly THUNDRA_TRACE_INTEGRATIONS_AWS_DYNAMODB_STATEMENT_MASK: string =
        'thundra.agent.trace.integrations.aws.dynamodb.statement.mask';
    public static readonly THUNDRA_TRACE_INTEGRATIONS_AWS_DYNAMODB_TRACEINJECTION_ENABLE: string =
        'thundra.agent.trace.integrations.aws.dynamodb.traceinjection.enable';

    public static readonly THUNDRA_TRACE_INTEGRATIONS_AWS_ATHENA_STATEMENT_MASK: string =
        'thundra.agent.trace.integrations.aws.athena.statement.mask';

    public static readonly THUNDRA_TRACE_INTEGRATIONS_HTTP_BODY_MASK: string =
        'thundra.agent.trace.integrations.http.body.mask';
    public static readonly THUNDRA_TRACE_INTEGRATIONS_HTTP_URL_DEPTH: string =
        'thundra.agent.trace.integrations.http.url.depth';
    public static readonly THUNDRA_TRACE_INTEGRATIONS_HTTP_TRACEINJECTION_DISABLE: string =
        'thundra.agent.trace.integrations.http.traceinjection.disable';
    public static readonly THUNDRA_TRACE_INTEGRATIONS_HTTP_ERROR_ON_4XX_DISABLE: string =
        'thundra.agent.trace.integrations.http.error.on4xx.disable';
    public static readonly THUNDRA_TRACE_INTEGRATIONS_HTTP_ERROR_ON_5XX_DISABLE: string =
        'thundra.agent.trace.integrations.http.error.on5xx.disable';

    public static readonly THUNDRA_TRACE_INTEGRATIONS_REDIS_COMMAND_MASK: string =
        'thundra.agent.trace.integrations.redis.command.mask';

    public static readonly THUNDRA_TRACE_INTEGRATIONS_RDB_STATEMENT_MASK: string =
        'thundra.agent.trace.integrations.rdb.statement.mask';

    public static readonly THUNDRA_TRACE_INTEGRATIONS_ELASTICSEARCH_BODY_MASK: string =
        'thundra.agent.trace.integrations.elasticsearch.body.mask';
    public static readonly THUNDRA_TRACE_INTEGRATIONS_ELASTICSEARCH_PATH_DEPTH: string =
        'thundra.agent.trace.integrations.elasticsearch.path.depth';

    public static readonly THUNDRA_TRACE_INTEGRATIONS_MONGODB_COMMAND_MASK: string =
        'thundra.agent.trace.integrations.mongodb.command.mask';

    public static readonly THUNDRA_TRACE_INTEGRATIONS_EVENTBRIDGE_DETAIL_MASK: string =
        'thundra.agent.trace.integrations.aws.eventbridge.detail.mask';

    /////////////////////////////////////////////////////////////////////////////

    public static readonly THUNDRA_LOG_CONSOLE_DISABLE: string =
        'thundra.agent.log.console.disable';
    public static readonly THUNDRA_LOG_LOGLEVEL: string =
        'thundra.agent.log.loglevel';

    /////////////////////////////////////////////////////////////////////////////

    public static readonly THUNDRA_LAMBDA_DEBUGGER_ENABLE: string =
        'thundra.agent.lambda.debugger.enable';
    public static readonly THUNDRA_LAMBDA_DEBUGGER_PORT: string =
        'thundra.agent.lambda.debugger.port';
    public static readonly THUNDRA_LAMBDA_DEBUGGER_LOGS_ENABLE: string =
        'thundra.agent.lambda.debugger.logs.enable';
    public static readonly THUNDRA_LAMBDA_DEBUGGER_WAIT_MAX: string =
        'thundra.agent.lambda.debugger.wait.max';
    public static readonly THUNDRA_LAMBDA_DEBUGGER_IO_WAIT: string =
        'thundra.agent.lambda.debugger.io.wait';
    public static readonly THUNDRA_LAMBDA_DEBUGGER_BROKER_PORT: string =
        'thundra.agent.lambda.debugger.broker.port';
    public static readonly THUNDRA_LAMBDA_DEBUGGER_BROKER_HOST: string =
        'thundra.agent.lambda.debugger.broker.host';
    public static readonly THUNDRA_LAMBDA_DEBUGGER_SESSION_NAME: string =
        'thundra.agent.lambda.debugger.session.name';
    public static readonly THUNDRA_LAMBDA_DEBUGGER_AUTH_TOKEN: string =
        'thundra.agent.lambda.debugger.auth.token';

}

export default ConfigNames;
