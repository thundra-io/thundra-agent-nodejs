import HttpIntegration from './plugins/integrations/HttpIntegration';
import PostgreIntegration from './plugins/integrations/PostgreIntegration';
import MySQL2Integration from './plugins/integrations/MySQL2Integration';
import MySQLIntegration from './plugins/integrations/MySQLIntegration';
import RedisIntegration from './plugins/integrations/RedisIntegration';
import MongoDBIntegration from './plugins/integrations/MongoDBIntegration';
import IORedisIntegration from './plugins/integrations/IORedisIntegration';
import {AWSIntegration} from './plugins/integrations/AWSIntegration';
import ESIntegration from './plugins/integrations/ESIntegration';
import FilteringSpanListener from './plugins/listeners/FilteringSpanListener';
import ErrorInjectorSpanListener from './plugins/listeners/ErrorInjectorSpanListener';
import LatencyInjectorSpanListener from './plugins/listeners/LatencyInjectorSpanListener';
import TagInjectorSpanListener from './plugins/listeners/TagInjectorSpanListener';
import SecurityAwareSpanListener from './plugins/listeners/SecurityAwareSpanListener';
const { version } = require('../package.json');

export const EnvVariableKeys = {

    LAMBDA_TASK_ROOT: 'LAMBDA_TASK_ROOT',

    AWS_LAMBDA_LOG_STREAM_NAME: 'AWS_LAMBDA_LOG_STREAM_NAME',
    AWS_LAMBDA_FUNCTION_VERSION: 'AWS_LAMBDA_FUNCTION_VERSION',
    AWS_REGION: 'AWS_REGION',
    AWS_LAMBDA_FUNCTION_MEMORY_SIZE: 'AWS_LAMBDA_FUNCTION_MEMORY_SIZE',
    AWS_LAMBDA_FUNCTION_NAME: 'AWS_LAMBDA_FUNCTION_NAME',

    _X_AMZN_TRACE_ID: '_X_AMZN_TRACE_ID',

    SLS_LOCAL: 'IS_LOCAL',
    AWS_SAM_LOCAL: 'AWS_SAM_LOCAL',

    NODE_TLS_REJECT_UNAUTHORIZED: 'NODE_TLS_REJECT_UNAUTHORIZED',
    _HANDLER: '_HANDLER',
};

export function getTimeoutMargin(region: string) {
    if (region) {
        if (region === 'us-west-2') { // our region
            return 200;
        } else if (region.startsWith('us-west-')) { // Any region at west of USA
            return 400;
        } else if (region.startsWith('us-')) { // Any region at USA
            return 600;
        } else if (region.startsWith('ca-')) { // Any region at Canada
            return 600;
        } else if (region.startsWith('sa-')) { // Any region at South America
            return 800;
        } else if (region.startsWith('cn-')) { // Any region at China
            return 1000;
        } else if (region.startsWith('eu-')) { // Any region at Europe
            return 1000;
        } else if (region.startsWith('ap-')) { // Any region at Asia Pacific
            return 1000;
        }
    }
    return 1000;
}

export const AGENT_VERSION: string = version;
export const DATA_MODEL_VERSION: string = '2.0';
export const TIMEOUT_MARGIN: number = getTimeoutMargin(process.env[EnvVariableKeys.AWS_REGION]);

export const LAMBDA_APPLICATION_DOMAIN_NAME = 'API';
export const LAMBDA_APPLICATION_CLASS_NAME = 'AWS-Lambda';
export const LAMBDA_FUNCTION_PLATFORM = 'AWS Lambda';

export const HOOKS = [
    'before-invocation',
    'after-invocation',
];

export function getDefaultCollectorEndpoint() {
    const region = process.env[EnvVariableKeys.AWS_REGION];
    if (region) {
        return `${region}.collector.thundra.io`;
    }
    return 'collector.thundra.io';
}

export const MONITORING_DATA_PATH = '/monitoring-data';
export const COMPOSITE_MONITORING_DATA_PATH = '/composite-monitoring-data';

export const PROC_STAT_PATH: string = '/proc/self/stat';
export const PROC_IO_PATH: string = '/proc/self/io';
export const ARGS_TAG_NAME: string = 'method.args';
export const RETURN_VALUE_TAG_NAME: string = 'method.return_value';

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
    AWS: 'AWS',
    DB: 'DB',
    MESSAGING: 'Messaging',
    STREAM: 'Stream',
    STORAGE: 'Storage',
    API: 'API',
    CACHE: 'Cache',
    SCHEDULE: 'Schedule',
    CDN: 'CDN',
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
    ZEIT: 'ZEIT',
    NETLIFY: 'Netlify',
    SES: 'AWS-SES',
};

export const AWS_SERVICE_REQUEST = 'AWSServiceRequest';

export const ZeitTags = {
    DEPLOYMENT_URL: 'DEPLOYMENT_URL',
};

export const ZeitConstants = {
    DEPLOYMENT_URL_HEADER: 'x-now-deployment-url',
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

export const LineByLineTags = {
    LINES: 'method.lines',
    SOURCE: 'method.source',
    START_LINE: 'method.startLine',
    NEXT_SPAN_IDS: 'nextSpanIds',
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
    QUERY_PARAMS: 'http.query_params',
    BODY: 'http.body',
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

export const TriggerHeaderTags = {
    RESOURCE_NAME: 'x-thundra-resource-name',
};

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
};

export const INTEGRATIONS: any = {
    http: HttpIntegration,
    pg: PostgreIntegration,
    mysql2: MySQL2Integration,
    mysql: MySQLIntegration,
    redis: RedisIntegration,
    ioredis: IORedisIntegration,
    aws: AWSIntegration,
    es: ESIntegration,
    mongodb: MongoDBIntegration,
};

export const LISTENERS: any = {
    FilteringSpanListener,
    ErrorInjectorSpanListener,
    LatencyInjectorSpanListener,
    TagInjectorSpanListener,
    SecurityAwareSpanListener,
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

export const DEBUG_BRIDGE_FILE_NAME = 'debugBridge.js';
export const BROKER_WS_PROTOCOL = 'ws://';
export const BROKER_WSS_PROTOCOL = 'wss://';
export const BROKER_WS_HTTP_ERROR_PATTERN = /:\s*\D*(\d+)/;
export const BROKER_WS_HTTP_ERR_CODE_TO_MSG: {[key: number]: string} = {
    429: `Reached the concurrent session limit, couldn't start Thundra debugger.`,
    401: `Authentication is failed, check your Thundra debugger authentication token.`,
    409: `Another session with the same session name exists, connection closed.`,
};
