/**
 * Defines all global constants here
 */

import HttpIntegration from './integrations/HttpIntegration';
import Http2Integration from './integrations/Http2Integration';
import PostgreIntegration from './integrations/PostgreIntegration';
import MySQL2Integration from './integrations/MySQL2Integration';
import MySQLIntegration from './integrations/MySQLIntegration';
import RedisIntegration from './integrations/RedisIntegration';
import MongoDBIntegration from './integrations/MongoDBIntegration';
import IORedisIntegration from './integrations/IORedisIntegration';
import { AWSIntegration } from './integrations/AWSIntegration';
import { AWSv3Integration } from './integrations/AWSv3Integration';
import ESLegacyIntegration from './integrations/ESLegacyIntegration';
import ESIntegration from './integrations/ESIntegration';
import AMQPLIBIntegration from './integrations/AmqplibIntegration';
import GoogleCloudPubSubIntegration from './integrations/GoogleCloudPubSubIntegration';
import GoogleCloudCommonIntegration from './integrations/GoogleCloudCommonIntegration';
import FilteringSpanListener from './listeners/FilteringSpanListener';
import ErrorInjectorSpanListener from './listeners/ErrorInjectorSpanListener';
import LatencyInjectorSpanListener from './listeners/LatencyInjectorSpanListener';
import TagInjectorSpanListener from './listeners/TagInjectorSpanListener';
import SecurityAwareSpanListener from './listeners/SecurityAwareSpanListener';

const {version} = require('../package.json');

export const EnvVariableKeys = {

    LAMBDA_TASK_ROOT: 'LAMBDA_TASK_ROOT',

    AWS_EXECUTION_ENV: 'AWS_EXECUTION_ENV',
    AWS_LAMBDA_LOG_STREAM_NAME: 'AWS_LAMBDA_LOG_STREAM_NAME',
    AWS_LAMBDA_FUNCTION_VERSION: 'AWS_LAMBDA_FUNCTION_VERSION',
    AWS_REGION: 'AWS_REGION',
    AWS_LAMBDA_FUNCTION_MEMORY_SIZE: 'AWS_LAMBDA_FUNCTION_MEMORY_SIZE',
    AWS_LAMBDA_FUNCTION_NAME: 'AWS_LAMBDA_FUNCTION_NAME',
    AWS_LAMBDA_INITIALIZATION_TYPE: 'AWS_LAMBDA_INITIALIZATION_TYPE',

    _X_AMZN_TRACE_ID: '_X_AMZN_TRACE_ID',

    SLS_LOCAL: 'IS_LOCAL',
    AWS_SAM_LOCAL: 'AWS_SAM_LOCAL',
    SST_LOCAL: 'IS_LOCAL',

    NODE_TLS_REJECT_UNAUTHORIZED: 'NODE_TLS_REJECT_UNAUTHORIZED',
    _HANDLER: '_HANDLER',

    GGC_VERSION: 'GGC_VERSION',
    MY_FUNCTION_ARN: 'MY_FUNCTION_ARN',
};

export function getTimeoutMargin(region: string) {
    // Region based timeout margin is tricky because there are also other parameters
    // like memory size and telemetry data size.
    // So, just to be safe, use 1 seconds by default for all cases.
    return 1000;
}

export const AGENT_VERSION: string = version;
export const DATA_MODEL_VERSION: string = '2.0';
export const TIMEOUT_MARGIN: number = getTimeoutMargin(process.env[EnvVariableKeys.AWS_REGION]);

export const LAMBDA_APPLICATION_DOMAIN_NAME = 'API';
export const LAMBDA_APPLICATION_CLASS_NAME = 'AWS-Lambda';
export const LAMBDA_FUNCTION_PLATFORM = 'AWS Lambda';
export const LAMBDA_INIT_TYPE_PROVISIONED_CONCURRENCY = 'provisioned-concurrency';

export function getDefaultCollectorEndpoint() {
    const region = process.env[EnvVariableKeys.AWS_REGION];
    if (region) {
        return `${region}.collector.thundra.io`;
    }
    return 'collector.thundra.io';
}

export const MONITORING_DATA_PATH = '/monitoring-data';
export const COMPOSITE_MONITORING_DATA_PATH = '/composite-monitoring-data';
export const LOCAL_COLLECTOR_ENDPOINT = 'localhost:3333';

export const PROC_STAT_PATH: string = '/proc/self/stat';
export const PROC_IO_PATH: string = '/proc/self/io';

export const logLevels: any = {
    0: 0,
    1: 1,
    2: 2,
    3: 3,
    4: 4,
    5: 5,
    6: 6,

    trace: 0,
    debug: 1,
    info: 2,
    warn: 3,
    error: 4,
    fatal: 5,
    none: 6,

    TRACE: 0,
    DEBUG: 1,
    INFO: 2,
    WARN: 3,
    ERROR: 4,
    FATAL: 5,
    NONE: 6,
};

export const DomainNames = {
    SERVERLESS: 'Serverless',
    AWS: 'AWS',
    DB: 'DB',
    MESSAGING: 'Messaging',
    STREAM: 'Stream',
    STORAGE: 'Storage',
    API: 'API',
    CACHE: 'Cache',
    SCHEDULE: 'Schedule',
    CDN: 'CDN',
    NODE_GENERIC: 'Node-Generic',
};

export const ClassNames = {
    AWSSERVICE: 'AWSService',
    DYNAMODB: 'AWS-DynamoDB',
    SQS: 'AWS-SQS',
    SNS: 'AWS-SNS',
    KINESIS: 'AWS-Kinesis',
    FIREHOSE: 'AWS-Firehose',
    S3: 'AWS-S3',
    LAMBDA: 'AWS-Lambda',
    LAMBDA_INIT: 'AWS-Lambda-Init',
    RDB: 'RDB',
    REDIS: 'Redis',
    HTTP: 'HTTP',
    CLOUDWATCH: 'AWS-CloudWatch-Schedule',
    CLOUDFRONT: 'AWS-CloudFront',
    APIGATEWAY: 'AWS-APIGateway',
    ATHENA: 'AWS-Athena',
    MONGODB: 'MONGODB',
    ELASTICSEARCH: 'ELASTICSEARCH',
    MYSQL: 'MYSQL',
    EVENTBRIDGE: 'AWS-EventBridge',
    VERCEL: 'VERCEL',
    NETLIFY: 'Netlify',
    SES: 'AWS-SES',
    STEPFUNCTIONS: 'AWS-StepFunctions',
    EXPRESS: 'Express',
    KOA: 'Koa',
    HAPI: 'Hapi',
    NODE_HANDLER: 'Node-Handler',
    GOOGLE_BIGQUERY: 'Google-BigQuery',
    GOOGLE_PUBSUB: 'Google-PubSub',
    GOOGLE_PUBSUB_NODE_HANDLER: 'Google-PubSub-Node-Handler',
    RABBITMQ: 'RabbitMQ',
};

export const AWS_SERVICE_REQUEST = 'AWSServiceRequest';

export const GenericWrapperTags = {
    FUNCTION_NAME: 'generic.wrapper.function.name',
};

export const AwsTags = {
    AWS_REGION: 'aws.region',
    AWS_ACCOUNT_NO: 'aws.account_no',
    AWS_XRAY_TRACE_ID: 'aws.xray.trace.id',
    AWS_XRAY_SEGMENT_ID: 'aws.xray.segment.id',
};

export const AwsLambdaWrapperTags = {
    AWS_LAMBDA_ARN: 'aws.lambda.arn',
    AWS_LAMBDA_NAME: 'aws.lambda.name',
    AWS_LAMBDA_MEMORY_LIMIT: 'aws.lambda.memory_limit',
    AWS_LAMBDA_LOG_GROUP_NAME: 'aws.lambda.log_group_name',
    AWS_LAMBDA_LOG_STREAM_NAME: 'aws.lambda.log_stream_name',
    AWS_LAMBDA_INVOCATION_COLDSTART: 'aws.lambda.invocation.coldstart',
    AWS_LAMBDA_INVOCATION_REQUEST_ID: 'aws.lambda.invocation.request_id',
    AWS_LAMBDA_INVOCATION_MEMORY_USAGE: 'aws.lambda.invocation.memory_usage',
    AWS_LAMBDA_INVOCATION_TIMEOUT: 'aws.lambda.invocation.timeout',
    AWS_LAMBDA_INVOCATION_REQUEST: 'aws.lambda.invocation.request',
    AWS_LAMBDA_INVOCATION_RESPONSE: 'aws.lambda.invocation.response',
    AWS_LAMBDA_INIT_DURATION: 'aws.lambda.init_duration',
};

export const VercelTags = {
    DEPLOYMENT_URL: 'DEPLOYMENT_URL',
};

export const VercelConstants = {
    DEPLOYMENT_URL_HEADER: 'x-vercel-deployment-url',
};

export const NetlifyConstants = {
    NETLIFY_UNIQUE_ENV: 'NETLIFY_IMAGES_CDN_DOMAIN',
    NETLIFY_SITE_NAME: 'SITE_NAME',
    NETLIFY_DEV: 'NETLIFY_DEV',
};

export const AwsEventBridgeTags = {
    SERVICE_REQUEST: 'AWSEventBridgeRequest',
    EVENT_BUS_NAME: 'aws.eventbridge.eventbus.name',
    ENTRIES: 'aws.eventbridge.entries',
};

export const DBTags = {
    DB_STATEMENT: 'db.statement',
    DB_STATEMENT_TYPE: 'db.statement.type',
    DB_INSTANCE: 'db.instance',
    DB_TYPE: 'db.type',
    DB_HOST: 'db.host',
    DB_PORT: 'db.port',
    DB_USER: 'db.user',
};

export const SecurityTags = {
    BLOCKED: 'security.blocked',
    VIOLATED: 'security.violated',
};

export const MongoDBTags = {
    MONGODB_COMMAND: 'mongodb.command',
    MONGODB_COMMAND_NAME: 'mongodb.command.name',
    MONGODB_COLLECTION: 'mongodb.collection.name',
};

export const MethodTags = {
    ARGS: 'method.args',
    RETURN_VALUE: 'method.return_value',
};

export const LineByLineTags = {
    LINES: 'method.lines',
    SOURCE: 'method.source',
    START_LINE: 'method.startLine',
    NEXT_SPAN_IDS: 'nextSpanIds',
    LINES_OVERFLOW: 'method.linesOverflow',
};

export const MongoDBCommandTypes = {
    // Aggregate Commands
    AGGREGATE: 'READ',
    COUNT: 'READ',
    DISTINCT: 'READ',
    GROUP: 'READ',
    MAPREDUCE: 'READ',

    // Geospatial Commands
    GEONEAR: 'READ',
    GEOSEARCH: 'READ',

    // Query and Write Operation Commands
    DELETE: 'DELETE',
    EVAL: 'EXECUTE',
    FIND: 'READ',
    FINDANDMODIFY: 'WRITE',
    GETLASTERROR: 'READ',
    GETMORE: 'READ',
    GETPREVERROR: 'READ',
    INSERT: 'WRITE',
    PARALLELCOLLECTIONSCAN: 'READ',
    RESETERROR: 'WRITE',
    UPDATE: 'WRITE',

    // Query Plan Cache Commands
    PLANCACHECLEAR: 'DELETE',
    PLANCACHECLEARFILTERS: 'DELETE',
    PLANCACHELISTFILTERS: 'READ',
    PLANCACHELISTPLANS: 'READ',
    PLANCACHELISTQUERYSHAPES: 'READ',
    PLANCACHESETFILTER: 'WRITE',

    // Authentication Commands
    AUTHENTICATE: 'EXECUTE',
    LOGOUT: 'EXECUTE',

    // User Management Commands
    CREATEUSER: 'WRITE',
    DROPALLUSERSFROMDATABASE: 'DELETE',
    DROPUSER: 'DELETE',
    GRANROLESTOUSER: 'WRITE',
    REVOKEROLESFROMUSER: 'WRITE',
    UPDATEUSER: 'WRITE',
    USERSINFO: 'READ',

    // Role Management Commands
    CREATEROLE: 'WRITE',
    DROPROLE: 'DELETE',
    DROPALLROLESFROMDATABASE: 'DELETE',
    GRANTPRIVILEGESTOROLE: 'WRITE',
    GRANTROLESTOROLE: 'WRITE',
    INVALIDATEUSERCACHE: 'DELETE',
    REVOKEPRIVILEGESFROMROLE: 'WRITE',
    REVOKEROLESFROMROLE: 'WRITE',
    ROLESINFO: 'READ',
    UPDATEROLE: 'WRITE',

    // Replication Commands
    ISMASTER: 'READ',
    REPLSETABORTPRIMARYCATCHUP: 'EXECUTE',
    REPLSETFREEZE: 'EXECUTE',
    REPLSETGETCONFIG: 'READ',
    REPLSETGETSTATUS: 'READ',
    REPLSETINITIATE: 'EXECUTE',
    REPLSETMAINTENANCE: 'EXECUTE',
    REPLSETRECONFIG: 'EXECUTE',
    REPLSETRESIZEOPLOG: 'EXECUTE',
    REPLSETSTEPDOWN: 'EXECUTE',
    REPLSETSYNCFROM: 'EXECUTE',

    // Sharding Commands
    ADDSHARD: 'EXECUTE',
    ADDSHARDTOZONE: 'EXECUTE',
    BALANCERSTART: 'EXECUTE',
    BALANCERSTATUS: 'READ',
    BALANCERSTOP: 'EXECUTE',
    CLEANUPORPHANED: 'EXECUTE',
    ENABLESHARDING: 'EXECUTE',
    FLUSHROUTERCONFIG: 'EXECUTE',
    ISDBGRID: 'READ',
    LISTSHARDS: 'READ',
    MOVEPRIMARY: 'EXECUTE',
    MERGECHUNKS: 'EXECUTE',
    REMOVESHARD: 'EXECUTE',
    REMOVESHARDFROMZONE: 'EXECUTE',
    SHARDCOLLECTION: 'EXECUTE',
    SHARDINGSTATE: 'READ',
    SPLIT: 'EXECUTE',
    UPDATEZONEKEYRANGE: 'EXECUTE',

    // Session Commands
    ABORTTRANSACTION: 'EXECUTE',
    COMMITTRANSACTION: 'EXECUTE',
    ENDSESSIONS: 'EXECUTE',
    KILLALLSESSIONS: 'EXECUTE',
    KILLALLSESSIONSBYPATTERN: 'EXECUTE',
    KILLSESSIONS: 'EXECUTE',
    REFRESHSESSIONS: 'EXECUTE',
    STARTSESSION: 'EXECUTE',

    // Administration Commands
    CLONE: 'EXECUTE',
    CLONECOLLECTION: 'EXECUTE',
    CLONECOLLECTIONASCAPPED: 'EXECUTE',
    COLLMOD: 'WRITE',
    COMPACT: 'EXECUTE',
    CONVERTTOCAPPED: 'EXECUTE',
    COPYDB: 'EXECUTE',
    CREATE: 'WRITE',
    CREATEINDEXES: 'WRITE',
    CURRENTOP: 'READ',
    DROP: 'DELETE',
    DROPDATABASE: 'DELETE',
    DROPINDEXES: 'DELETE',
    FILEMD5: 'READ',
    FSYNC: 'EXECUTE',
    FSYNCUNLOCK: 'EXECUTE',
    GETPARAMETER: 'READ',
    KILLCURSORS: 'EXECUTE',
    KILLOP: 'EXECUTE',
    LISTCOLLECTIONS: 'READ',
    LISTDATABASES: 'READ',
    LISTINDEXES: 'READ',
    LOGROTATE: 'EXECUTE',
    REINDEX: 'WRITE',
    RENAMECOLLECTION: 'WRITE',
    REPAIRDATABASE: 'EXECUTE',
    SETFEATURECOMPATIBILITYVERSION: 'WRITE',
    SETPARAMETER: 'WRITE',
    SHUTDOWN: 'EXECUTE',
    TOUCH: 'EXECUTE',

    // Diagnostic Commands
    BUILDINFO: 'READ',
    COLLSTATS: 'READ',
    CONNPOOLSTATS: 'READ',
    CONNECTIONSTATUS: 'READ',
    CURSORINFO: 'READ',
    DBHASH: 'READ',
    DBSTATS: 'READ',
    DIAGLOGGING: 'READ',
    EXPLAIN: 'READ',
    FEATURES: 'READ',
    GETCMDLINEOPTS: 'READ',
    GETLOG: 'READ',
    HOSTINFO: 'READ',
    LISTCOMMANDS: 'READ',
    PROFILE: 'READ',
    SERVERSTATUS: 'READ',
    SHARDCONNPOOLSTATS: 'READ',
    TOP: 'READ',

    // Free Monitoring Commands
    SETFREEMONITORING: 'EXECUTE',

    // Auditing Commands
    LOGAPPLICATIONMESSAGE: 'EXECUTE',
};

export const DBTypes = {
    DYNAMODB: 'aws-dynamodb',
    REDIS: 'redis',
    PG: 'postgresql',
    MYSQL: 'mysql',
    ELASTICSEARCH: 'elasticsearch',
    MONGODB: 'mongodb',
};

export const HttpTags = {
    HTTP_METHOD: 'http.method',
    HTTP_URL: 'http.url',
    HTTP_PATH: 'http.path',
    HTTP_HOST: 'http.host',
    HTTP_STATUS: 'http.status_code',
    HTTP_ROUTE_PATH: 'http.route_path',
    QUERY_PARAMS: 'http.query_params',
    BODY: 'http.body',
    RESPONSE_BODY: 'http.response.body',
};

export const RedisTags = {
    REDIS_HOST: 'redis.host',
    REDIS_PORT: 'redis.port',
    REDIS_COMMAND: 'redis.command',
    REDIS_COMMANDS: 'redis.commands',
    REDIS_COMMAND_TYPE: 'redis.command.type',
    REDIS_COMMAND_ARGS: 'redis.command.args',
};

export const ESTags = {
    ES_URI: 'elasticsearch.uri',
    ES_NORMALIZED_URI: 'elasticsearch.normalized_uri',
    ES_METHOD: 'elasticsearch.method',
    ES_PARAMS: 'elasticsearch.params',
    ES_BODY: 'elasticsearch.body',
};

interface AMQPLIBType {
    [key: string]: string;
}

export const AMQPTags: AMQPLIBType = {
    HOST: 'amqp.host',
    PORT: 'amqp.port',
    QUEUE: 'amqp.queue',
    EXCHANGE: 'amqp.exchange',
    ROUTING_KEY: 'amqp.routing_key',
    MESSAGE: 'amqp.message',
    VHOST: 'amqp.vhost',
    METHOD: 'amqp.method',
};

export const AwsSDKTags = {
    SERVICE_NAME: 'aws.service.name',
    REQUEST_NAME: 'aws.request.name',
    HOST: 'host',
};

export const AwsDynamoTags = {
    TABLE_NAME: 'aws.dynamodb.table.name',
    REQUEST_THROTTLED: 'aws.dynamodb.request.throttled',
};

export const AwsFirehoseTags = {
    STREAM_NAME: 'aws.firehose.stream.name',
};

export const AwsKinesisTags = {
    STREAM_NAME: 'aws.kinesis.stream.name',
};

export const AwsAthenaTags = {
    S3_OUTPUT_LOCATION: 'aws.athena.s3.outputLocation',
    REQUEST_QUERY_EXECUTION_IDS: 'aws.athena.request.query.executionIds',
    RESPONSE_QUERY_EXECUTION_IDS: 'aws.athena.response.query.executionIds',
    REQUEST_NAMED_QUERY_IDS: 'aws.athena.request.namedQuery.ids',
    RESPONSE_NAMED_QUERY_IDS: 'aws.athena.response.namedQuery.ids',
};

export const AwsLambdaTags = {
    FUNCTION_NAME: 'aws.lambda.name',
    FUNCTION_QUALIFIER: 'aws.lambda.qualifier',
    INVOCATION_TYPE: 'aws.lambda.invocation.type',
    INVOCATION_PAYLOAD: 'aws.lambda.invocation.payload',
};

export const AwsS3Tags = {
    BUCKET_NAME: 'aws.s3.bucket.name',
    OBJECT_NAME: 'aws.s3.object.name',
};

export const AwsSNSTags = {
    TOPIC_NAME: 'aws.sns.topic.name',
    TARGET_NAME: 'aws.sns.target.name',
    SMS_PHONE_NUMBER: 'aws.sns.sms.phone_number',
    MESSAGE: 'aws.sns.message',
};

export const AwsSQSTags = {
    QUEUE_NAME: 'aws.sqs.queue.name',
    MESSAGE: 'aws.sqs.message',
    MESSAGES: 'aws.sqs.messages',
};

export const AwsSESTags = {
    SERVICE_REQUEST: 'AWSSESRequest',
    SUBJECT: 'aws.ses.mail.subject',
    BODY: 'aws.ses.mail.body',
    TEMPLATE_NAME: 'aws.ses.mail.template.name',
    TEMPLATE_ARN: 'aws.ses.mail.template.arn',
    TEMPLATE_DATA: 'aws.ses.mail.template.data',
    SOURCE: 'aws.ses.mail.source',
    DESTINATION: 'aws.ses.mail.destination',
};

export const AwsStepFunctionsTags = {
    STATE_MACHINE_ARN: 'aws.sf.state_machine.arn',
    EXECUTION_NAME: 'aws.sf.execution.name',
    EXECUTION_INPUT: 'aws.sf.execution.input',
    EXECUTION_ARN: 'aws.sf.execution.arn',
    EXECUTION_START_DATE: 'aws.sf.execution.start_date',
};

export const SpanTags = {
    SPAN_TYPE: 'span.type',
    OPERATION_TYPE: 'operation.type',
    TRIGGER_DOMAIN_NAME: 'trigger.domainName',
    TRIGGER_CLASS_NAME: 'trigger.className',
    TRIGGER_OPERATION_NAMES: 'trigger.operationNames',
    TOPOLOGY_VERTEX: 'topology.vertex',
    TRACE_LINKS: 'trace.links',
    RESOURCE_NAMES: 'resource.names',
};

export const GoogleCommonTags = {
    PROJECT_ID: 'google.projectId',
    SERVICE: 'google.service.name',
};

export const GooglePubSubTags = {
    SUBSCRIPTION: 'google.pubsub.subscription',
    TOPIC_NAME: 'google.pubsub.topic.name',
    MESSAGEIDS: 'google.pubsub.messageIds',
    MESSAGES: 'google.pubsub.messages',
    MESSAGE: 'google.pubsub.message',
    ACK: 'google.pubsub.ack',
};

export const GoogleBigQueryTags = {
    OPERATION: 'google.bigquery.operation',
    JOB_ID: 'google.bigquery.job.id',
    QUERY: 'google.bigquery.query',
    RESPONSE: 'google.bigquery.response',
};

export const ErrorTags = {
    ERROR: 'error',
    ERROR_KIND: 'error.kind',
    ERROR_MESSAGE: 'error.message',
    ERROR_STACK: 'error.stack',
};

export const TraceHeaderTags = {
    TRACE_ID: 'x-thundra-trace-id',
    TRANSACTION_ID: 'x-thundra-transaction-id',
    SPAN_ID: 'x-thundra-span-id',
    BAGGAGE_PREFIX: 'x-thundra-baggage-',
};

export const TriggerHeaderTags = {
    RESOURCE_NAME: 'x-thundra-resource-name',
};

export const AlreadyTracedHeader = 'x-thundra-already-traced';

export const SpanTypes = {
    REDIS: 'Redis',
    ELASTIC: 'Elastic',
    RDB: 'RDB',
    HTTP: 'HTTP',
    AWS_DYNAMO: 'AWS-DynamoDB',
    AWS_SQS: 'AWS-SQS',
    AWS_SNS: 'AWS-SNS',
    AWS_KINESIS: 'AWS-Kinesis',
    AWS_FIREHOSE: 'AWS-Firehose',
    AWS_S3: 'AWS-S3',
    AWS_LAMBDA: 'AWS-Lambda',
    AWS_ATHENA: 'AWS-Athena',
    AWS_EVENTBRIDGE: 'AWS-EventBridge',
    AWS_SES: 'AWS-SES',
    AWS_STEPFUNCTIONS: 'AWS-StepFunctions',
    RABBITMQ: 'RabbitMQ',
    GOOGLE_PUBSUB: 'Google-PubSub',
    GOOGLE_BIGQUERY: 'Google-BigQuery',
};

export const INTEGRATIONS: any = {
    http: {class: HttpIntegration, moduleNames: ['http', 'https'], moduleVersion: null},
    http2: {class: Http2Integration, moduleNames: ['http2'], moduleVersion: null},
    pg: {class: PostgreIntegration, moduleNames: ['pg'], moduleVersion: '6.x || 7.x || 8.x'},
    mysql2: {class: MySQL2Integration, moduleNames: ['mysql2'], moduleVersion: '>=1.5'},
    mysql: {class: MySQLIntegration, moduleNames: ['mysql'], moduleVersion: '>=2'},
    redis: {class: RedisIntegration, moduleNames: ['redis'], moduleVersion: '>=2.6'},
    ioredis: {class: IORedisIntegration, moduleNames: ['ioredis'], moduleVersion: '>=2'},
    aws: {class: AWSIntegration, moduleNames: ['aws-sdk/global', 'aws-sdk/lib/core.js'], moduleVersion: '2.x'},
    aws3: {class: AWSv3Integration, moduleNames: ['@aws-sdk/smithy-client'], moduleVersion: '3.x'},
    es: {class: ESIntegration, moduleNames: ['@elastic/elasticsearch'], moduleVersion: '>=5.6.16'},
    esLegacy: {class: ESLegacyIntegration, moduleNames: ['elasticsearch'], moduleVersion: '>=10.5'},
    mongodb: {class: MongoDBIntegration, moduleNames: ['mongodb'], moduleVersion: '>=1'},
    amqplib: {class: AMQPLIBIntegration, moduleNames: [
        'amqplib',
        'amqplib/callback_api.js',
        'amqplib/lib/callback_model.js',
        'amqplib/lib/channel_model.js',
        'amqplib/lib/channel.js',
    ],
    moduleVersion: '>=0.5'},
    'googlecloud.pubsub': {class: GoogleCloudPubSubIntegration, moduleNames: ['@google-cloud/pubsub'], moduleVersion: '>=1.2'},
    'googlecloud.common': {class: GoogleCloudCommonIntegration, moduleNames: ['@google-cloud/common'], moduleVersion: '>=3.0'},
};

export const WRAPPERS: any = {
    hapi: {
        moduleNames: [
            '@hapi/hapi',
            'hapi',
    ]},
    express: {
        moduleNames: [
            'express',
    ]},
    koa: {
        moduleNames: [
            'koa/lib/application.js',
    ]},
};

export const LISTENERS: any = {
    FilteringSpanListener,
    ErrorInjectorSpanListener,
    LatencyInjectorSpanListener,
    TagInjectorSpanListener,
    SecurityAwareSpanListener,
};

export const GoogleCommonOperationTypes: any = {
    GET : 'READ',
    POST : 'WRITE',
    PUT : 'WRITE',
    PATCH : 'WRITE',
    DELETE : 'DELETE',
};

export const GooglePubSubOperationTypes: any = {
    PULL: 'READ',
    PUBLISH: 'WRITE',
    CREATE_SUBSCRIPTION: 'WRITE',
    DELETE_SUBSCRIPTION: 'DELETE',
    CREATE_TOPIC: 'WRITE',
    DELETE_TOPIC: 'DELETE',
};

export const RedisCommandTypes: any = {
    APPEND: 'WRITE',
    BGREWRITEAOF: 'WRITE',
    BGSAVE: 'WRITE',
    BITCOUNT: 'READ',
    BITFIELD: 'WRITE',
    BITOP: 'WRITE',
    BITPOS: 'READ',
    BLPOP: 'DELETE',
    BRPOP: 'DELETE',
    BRPOPLPUSH: 'WRITE',
    BZPOPMIN: 'DELETE',
    BZPOPMAX: 'DELETE',
    DBSIZE: 'READ',
    DECR: 'WRITE',
    DECRBY: 'WRITE',
    DEL: 'DELETE',
    EVAL: 'EXECUTE',
    EVALSHA: 'EXECUTE',
    EXISTS: 'READ',
    EXPIRE: 'WRITE',
    EXPIREAT: 'WRITE',
    FLUSHALL: 'DELETE',
    FLUSHDB: 'DELETE',
    GEOADD: 'WRITE',
    GEOHASH: 'READ',
    GEOPOS: 'READ',
    GEODIST: 'READ',
    GEORADIUS: 'READ',
    GEORADIUSBYMEMBER: 'READ',
    GET: 'READ',
    GETBIT: 'READ',
    GETRANGE: 'READ',
    GETSET: 'WRITE',
    HDEL: 'DELETE',
    HEXISTS: 'READ',
    HGET: 'READ',
    HGETALL: 'READ',
    HINCRBY: 'WRITE',
    HINCRBYFLOAT: 'WRITE',
    HEYS: 'READ',
    HLEN: 'READ',
    HMGET: 'READ',
    HMSET: 'WRITE',
    HSET: 'WRITE',
    HSETNX: 'WRITE',
    HSTRLEN: 'READ',
    HVALS: 'READ',
    INCR: 'WRITE',
    INCRBY: 'WRITE',
    INCRBYFLOAT: 'WRITE',
    KEYS: 'READ',
    LINDEX: 'READ',
    LINSERT: 'WRITE',
    LLEN: 'READ',
    LPOP: 'DELETE',
    LPUSH: 'WRITE',
    LPUSHX: 'WRITE',
    LRANGE: 'READ',
    LREM: 'DELETE',
    LSET: 'WRITE',
    LTRIM: 'DELETE',
    MGET: 'READ',
    MSET: 'WRITE',
    MSETNX: 'WRITE',
    PERSIST: 'WRITE',
    PEXPIRE: 'WRITE',
    PEXPIREAT: 'WRITE',
    PFADD: 'WRITE',
    PFCOUNT: 'READ',
    PFMERGE: 'WRITE',
    PSETEX: 'WRITE',
    PUBLISH: 'WRITE',
    RPOP: 'DELETE',
    RPOPLPUSH: 'WRITE',
    RPUSH: 'WRITE',
    RPUSHX: 'WRITE',
    SADD: 'WRITE',
    SCARD: 'READ',
    SDIFFSTORE: 'WRITE',
    SET: 'WRITE',
    SETBIT: 'WRITE',
    SETEX: 'WRITE',
    SETNX: 'WRITE',
    SETRANGE: 'WRITE',
    SINTER: 'READ',
    SINTERSTORE: 'WRITE',
    SISMEMBER: 'READ',
    SMEMBERS: 'READ',
    SMOVE: 'WRITE',
    SORT: 'WRITE',
    SPOP: 'DELETE',
    SRANDMEMBER: 'READ',
    SREM: 'DELETE',
    STRLEN: 'READ',
    SUNION: 'READ',
    SUNIONSTORE: 'WRITE',
    ZADD: 'WRITE',
    ZCARD: 'READ',
    ZCOUNT: 'READ',
    ZINCRBY: 'WRITE',
    ZINTERSTORE: 'WRITE',
    ZLEXCOUNT: 'READ',
    ZPOPMAX: 'DELETE',
    ZPOPMIN: 'DELETE',
    ZRANGE: 'READ',
    ZRANGEBYLEX: 'READ',
    ZREVRANGEBYLEX: 'READ',
    ZRANGEBYSCORE: 'READ',
    ZRANK: 'READ',
    ZREM: 'DELETE',
    ZREMRANGEBYLEX: 'DELETE',
    ZREMRANGEBYRANK: 'DELETE',
    ZREMRANGEBYSCORE: 'DELETE',
    ZREVRANGE: 'READ',
    ZREVRANGEBYSCORE: 'READ',
    ZREVRANK: 'READ',
    ZSCORE: 'READ',
    ZUNIONSTORE: 'WRITE',
    SCAN: 'READ',
    SSCAN: 'READ',
    HSCAN: 'READ',
    ZSCAN: 'READ',
    XADD: 'WRITE',
    XRANGE: 'READ',
    XREVRANGE: 'READ',
    XLEN: 'READ',
    XREAD: 'READ',
    XREADGROUP: 'READ',
    XPENDING: 'READ',
};

export const SQLQueryOperationTypes: any = {
    SELECT: 'READ',
    INSERT: 'WRITE',
    UPDATE: 'WRITE',
    DELETE: 'WRITE',
};

export const ConsoleShimmedMethods = ['log', 'debug', 'info', 'warn', 'error'];

export const StdOutLogContext = 'STDOUT';

export const StdErrorLogContext = 'STDERR';

export const DefaultMongoCommandSizeLimit = 128 * 1024;

export const BROKER_WS_PROTOCOL = 'ws://';
export const BROKER_WSS_PROTOCOL = 'wss://';
export const BROKER_WS_HTTP_ERROR_PATTERN = /:\s*\D*(\d+)/;
export const BROKER_WS_HTTP_ERR_CODE_TO_MSG: { [key: number]: string } = {
    429: `Reached the concurrent session limit, couldn't start Thundra debugger.`,
    401: `Authentication is failed, check your Thundra debugger authentication token.`,
    409: `Another session with the same session name exists, connection closed.`,
};

export const THUNDRA_TRACE_KEY = '_thundra';

export const SPAN_TAGS_TO_TRIM_1: string[] = [
    MethodTags.ARGS,
    MethodTags.RETURN_VALUE,
    LineByLineTags.LINES,
    LineByLineTags.SOURCE,
];
export const SPAN_TAGS_TO_TRIM_2: string[] = [
    AwsLambdaWrapperTags.AWS_LAMBDA_INVOCATION_REQUEST,
    AwsLambdaWrapperTags.AWS_LAMBDA_INVOCATION_RESPONSE,
    HttpTags.BODY,
    HttpTags.RESPONSE_BODY,
    DBTags.DB_STATEMENT,
    RedisTags.REDIS_COMMAND,
    RedisTags.REDIS_COMMANDS,
    RedisTags.REDIS_COMMAND_ARGS,
    ESTags.ES_BODY,
    MongoDBTags.MONGODB_COMMAND,
    AwsLambdaTags.INVOCATION_PAYLOAD,
    AwsSQSTags.MESSAGE,
    AwsSQSTags.MESSAGES,
    AwsSNSTags.MESSAGE,
    AwsSESTags.BODY,
    AwsSESTags.TEMPLATE_DATA,
    AwsEventBridgeTags.ENTRIES,
    AwsStepFunctionsTags.EXECUTION_INPUT,
];

export const THUNDRA_COLLECTOR_ENDPOINT_PATTERNS: any = {
    PATTERN1: /^api[-\w]*\.thundra\.io$/,
    PATTERN2: /^([\w-]+\.)?collector\.thundra\.io$/,
};

export const TESTCONTAINERS_HTTP_PATH_PATTERNS: any = {
    PATTERN1: /info\w*/,
    PATTERN2: /exec\/\w*/,
    PATTERN3: /containers\/\w*/,
    PATTERN4: /images\/\w*/,
};

export const GOOGLE_CLOUD_HTTP_PATTERNS: any = {
    PATTERN1: /.googleapis.com\w*/,
    PATTERN2: /google.pubsub.v1.\w*/,
};

export const REPORTER_HTTP_TIMEOUT: number = 3000;
export const REPORTER_DATA_SIZE_LIMIT: number = 1_000_000; // 1MB

export const AGENT_UUID_CONST: string = '3cda958c-e704-56ff-b519-ab2e3dc3ccc2';

export const enum TEST_STATUS {
    SUCCESSFUL = 'SUCCESSFUL',
    FAILED = 'FAILED',
    ABORTED = 'ABORTED',
    SKIPPED = 'SKIPPED',
}

export const enum JEST_TEST_EVENTS {
    SETUP = 'setup',
    TEARDOWN = 'teardown',
    TESTSTART = 'test_start',
    TESTDONE = 'test_done',
    TESTSKIP = 'test_skip',
    BEFOREEACHSTART = 'hook_start<beforeEach>',
    BEFOREEACHFINISH = 'hook_success<beforeEach>',
    AFTEREACHSTART = 'hook_start<afterEach>',
    AFTEREACHFINISH = 'hook_success<afterEach>',
    BEFOREALLSTART = 'hook_start<beforeAll>',
    BEFOREALLFINISH = 'hook_success<beforeAll>',
    AFTERALLSTART = 'hook_start<afterAll>',
    AFTERALLFINISH = 'hook_success<afterAll>',
}

export const enum ContextMode {
    GlobalMode,
    AsyncMode,
}

export const PROCESS_EXIT_EVENTS = [
    'beforeExit', 'SIGHUP', 'SIGINT', 'SIGQUIT', 'SIGILL', 'SIGTRAP',
    'SIGABRT', 'SIGBUS', 'SIGFPE', 'SIGUSR1', 'SIGSEGV',
    'SIGUSR2', 'SIGTERM',
];

export const KNOWN_TEST_FILE_PATHS = new Set([
    'src',
    'test',
    'tests',
    '_test_',
    '_tests_',
    '__test__',
    '__tests__',
]);

export const DEFAULT_APPLICATION_NAME = 'thundra-app';

export const MAX_ERROR_STACK_LENGTH = 4 * 1024;
