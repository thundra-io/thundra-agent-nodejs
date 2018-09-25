import * as url from 'url';
import HttpIntegration from './plugins/integrations/HttpIntegration';
import HttpsIntegration from './plugins/integrations/HttpsIntegration';
import PostgreIntegration from './plugins/integrations/PostgreIntegration';
import MySQL2Integration from './plugins/integrations/MySQL2Integration';
import RedisIntegration from './plugins/integrations/RedisIntegration';
import AWSIntegration from './plugins/integrations/AWSIntegration';

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

export const DATA_FORMAT_VERSION: string = '2.0';
export const TIMEOUT_MARGIN: number = getTimeoutMargin(process.env.AWS_REGION);
export const LAMBDA_APPLICATION_DOMAIN_NAME = 'API';
export const LAMBDA_APPLICATION_CLASS_NAME = 'AWS-Lambda';
export const LAMBDA_FUNCTION_PLATFORM = 'AWS Lambda';

export const HOOKS = [
    'before-invocation',
    'after-invocation',
];

export const URL: url.UrlWithStringQuery = url.parse(
    // the comment below is for ignoring in unit tests, do not remove it
    // istanbul ignore next
    process.env.thundra_lambda_publish_rest_baseUrl
        ? process.env.thundra_lambda_publish_rest_baseUrl
        : 'https://collector.thundra.io/api',
);

export const PROC_STAT_PATH: string = '/proc/self/stat';
export const PROC_IO_PATH: string = '/proc/self/io';
export const LOG_TAG_NAME: string = 'LOGS';
export const ARGS_TAG_NAME: string = 'ARGS';
export const RETURN_VALUE_TAG_NAME: string = 'RETURN_VALUE';

export const TRACE_INTEGRATION_ENV_KEY: string = 'thundra_trace_integrations';
export const TRACE_DEF_ENV_KEY: string = 'thundra_trace_def';
export const TRACE_DEF_FILE_PREFIX_ENV_KEY: string = 'thundra_trace_traceablePrefixes';
export const TRACE_DEF_SEPERATOR: string = '.';

export const Syntax = {
    FunctionDeclaration: 'FunctionDeclaration',
    FunctionExpression: 'FunctionExpression',
    ArrowFunctionExpression: 'ArrowFunctionExpression',
    AssignmentExpression: 'AssignmentExpression',
    VariableDeclarator: 'VariableDeclarator',
    CallExpression: 'CallExpression',
    CatchClause: 'CatchClause',
    ReturnStatement: 'ReturnStatement',
    BlockStatement: 'BlockStatement',
};

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

export const DBTags = {
    DB_STATEMENT: 'db.statement',
    DB_STATEMENT_TYPE: 'db.statement.type',
    DB_INSTANCE: 'db.instance',
    DB_TYPE: 'db.type',
    DB_HOST: 'db.host',
    DB_PORT: 'db.port',
    DB_USER: 'db.user',
};

export const HttpTags = {
    HTTP_METHOD: 'http.method',
    HTTP_URL: 'http.url',
    HTTP_PATH: 'http.path',
    HTTP_HOST: 'http.host',
    HTTP_STATUS: 'http.status',
};

export const RedisTags = {
    REDIS_HOST: 'redis.host',
    REDIS_PORT: 'redis.port',
    REDIS_COMMAND: 'redis.command',
    REDIS_COMMANDS: 'redis.commands',
    REDIS_COMMAND_TYPE: 'redis.comand.type',
    REDIS_COMMAND_ARGS: 'redis.command.args',
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

export const AwsLambdaTags = {
    FUNCTION_NAME: 'function.name',
    FUNCTION_QUALIFIER: 'function.qualifier',
    INVOCATION_TYPE: 'invocation.type',
    INVOCATION_PAYLOAD: 'invocation.payload',
};

export const AwsS3Tags = {
    BUCKET_NAME: 'bucket.name',
    OBJECT_NAME: 'object.name',
};

export const AwsSNSTags = {
    TOPIC_NAME: 'aws.sns.topic.name',
};

export const AwsSQSTags = {
    QUEUE_NAME: 'aws.sqs.queue.name',
};

export const AwsClassNames = {
    AwsSQS: 'AWS-SQS',
    AwsSNS: 'AWS-SNS',
    AwsDDB: 'AWS-DynamoDB',
    AwsKinesis: 'AWS-Kinesis',
    AwsFirehose: 'AWS-Firehose',
    AwsS3: 'AWS-S3',
    AwsLambda: 'AWS-Lambda',
};

export const SpanTags = {
    SPAN_TYPE: 'span.type',
    OPERATION_TYPE: 'operation.type',
};

export const SpanTypes = {
    REDIS: 'Redis',
    RDB: 'RDB',
    HTTP: 'HTTP',
    AWS_DYNAMO: 'AWS-DynamoDB',
    AWS_SQS: 'AWS-SQS',
    AWS_SNS: 'AWS-SNS',
    AWS_KINESIS: 'AWS-Kinesis',
    AWS_FIREHOSE: 'AWS-Firehose',
    AWS_S3: 'AWS-S3',
    AWS_LAMBDA: 'AWS-Lambda',
};

export const INTEGRATIONS: any = {
    http: HttpIntegration,
    https: HttpsIntegration,
    pg: PostgreIntegration,
    mysql2: MySQL2Integration,
    redis: RedisIntegration,
    aws: AWSIntegration,
};

export const SQSCommandTypes: any = {
    receiveMessage: 'READ',
    sendMessage: 'WRITE',
    sendMessageBatch: 'WRITE',
    deleteMessage: 'DELETE',
    deleteMessageBatch: 'DELETE',
};

export const SNSCommandTypes: any = {
    write: 'WRITE',
};

export const RedisCommandTypes: any  = {
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
    SET: 'READ',
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

export const DynamoDBRequestTypes: any = {
    batchGetItem: 'READ',
    batchWriteItem: 'WRITE',
    createTable: 'WRITE',
    createGlobalTable: 'WRITE',
    deleteItem: 'DELETE',
    deleteTable: 'DELETE',
    getItem: 'READ',
    putItem: 'WRITE',
    query: 'READ',
    scan: 'READ',
    updateItem: 'WRITE',

};

export const KinesisRequestTypes: any = {
    getRecords: 'READ',
    putRecords: 'WRITE',
    putRecord: 'WRITE',
};

export const S3RequestTypes: any = {
    deleteBucket: 'DELETE',
    createBucket: 'WRITE',
    copyObject: 'WRITE',
    deleteObject: 'DELETE',
    deleteObjects: 'DELETE',
    getObject: 'READ',
    getObjects: 'READ',
    listBuckets: 'READ',
    putObject: 'WRITE',
    putObjectAcl: 'WRITE',
};
