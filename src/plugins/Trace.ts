/*
*
* Calculates duration of the lambda handler function.
*
* Generates trace report data.
*
* Adds the trace report to the Reporter instance if async monitoring is not enabled (environment variable
* thundra_lambda_publish_cloudwatch_enable is not set), otherwise it logs the report for async monitoring.
*
*/
import AuditInfo from './data/trace/AuditInfo';
import ThundraRecorder from '../opentracing/Recorder';
import SpanTreeNode from '../opentracing/SpanTree';
import ThundraTracer from '../opentracing/Tracer';
import Utils from './Utils';
import TraceData from './data/trace/TraceData';
import TraceDataProperties from './data/trace/TraceProperties';
import {initGlobalTracer} from 'opentracing';
import HttpError from './error/HttpError';
import { LOG_TAG_NAME, INTEGRATIONS, SpanTags, DBTags, HttpTags, RedisTags, SpanTypes, AwsDynamoTags,
        AwsSQSTags, AwsSNSTags, AwsKinesisTags, AwsS3Tags, AwsLambdaTags } from '../Constants';
import TimeoutError from './error/TimeoutError';
import Reporter from '../Reporter';
import TraceConfig from './config/TraceConfig';
import Instrumenter from '../opentracing/instrument/Instrumenter';
import AuditInfoThrownError from './data/trace/AuditInfoThrownError';
import Integration from './integrations/Integration';

export class Trace {
    hooks: { 'before-invocation': (data: any) => void; 'after-invocation': (data: any) => void; };
    config: TraceConfig;
    dataType: string;
    traceData: TraceData;
    reporter: Reporter;
    pluginContext: any;
    apiKey: string;
    endTimestamp: number;
    startTimestamp: number;
    tracer: ThundraTracer;
    instrumenter: Instrumenter;
    integrations: Map<string, Integration>;

    constructor(config: TraceConfig) {
        this.hooks = {
            'before-invocation': this.beforeInvocation,
            'after-invocation': this.afterInvocation,
        };
        this.config = config;
        this.dataType = 'AuditData';
        this.traceData = new TraceData();
        const tracerConfig = config ? config.tracerConfig : {};

        this.tracer = new ThundraTracer(tracerConfig);
        initGlobalTracer(this.tracer);

        this.instrumenter = new Instrumenter(this.tracer, config);
        this.instrumenter.hookModuleCompile();

        this.integrations = new Map<string, Integration>();

        if (this.config && this.config.integrations) {
            for (const integration of config.integrations) {
                const clazz = INTEGRATIONS[integration.name];
                if (clazz) {
                    if (!this.integrations.get(integration.name)) {
                        const instance = new clazz(this.tracer, integration.opt);
                        this.integrations.set(integration.name, instance);
                    }
                }
            }
        }
    }

    report(data: any): void {
        this.reporter.addReport(data);
    }

    setPluginContext = (pluginContext: any) => {
        this.pluginContext = pluginContext;
        this.apiKey = pluginContext.apiKey;
    }

    beforeInvocation = (data: any) => {
        const { originalContext, originalEvent, reporter, contextId, transactionId } = data;
        this.reporter = reporter;
        this.endTimestamp = null;
        this.startTimestamp = Date.now();

        this.traceData.id = Utils.generateId();
        this.traceData.transactionId = transactionId;
        this.traceData.applicationName = originalContext.functionName;
        this.traceData.applicationId = this.pluginContext.applicationId;
        this.traceData.applicationVersion = this.pluginContext.applicationVersion;
        this.traceData.applicationProfile = this.pluginContext.applicationProfile;
        this.traceData.duration = null;
        this.traceData.startTimestamp = this.startTimestamp;
        this.traceData.endTimestamp = null;
        this.traceData.errors = [];
        this.traceData.thrownError = null;
        this.traceData.contextName = originalContext.functionName;
        this.traceData.contextId = contextId;

        this.traceData.auditInfo = new AuditInfo();
        this.traceData.auditInfo.contextName = originalContext.functionName;
        this.traceData.auditInfo.id = contextId;
        this.traceData.auditInfo.openTimestamp = this.startTimestamp;
        this.traceData.auditInfo.closeTimestamp = 0;
        this.traceData.auditInfo.thrownError = null;
        this.traceData.auditInfo.children = [];
        this.traceData.auditInfo.duration = 0;
        this.traceData.auditInfo.errors = [];

        this.traceData.properties = new TraceDataProperties();
        this.traceData.properties.timeout = 'false';
        this.traceData.properties.coldStart = this.pluginContext.requestCount > 0 ? 'false' : 'true',
        this.traceData.properties.functionMemoryLimitInMB =  originalContext.memoryLimitInMB;
        this.traceData.properties.functionRegion = this.pluginContext.applicationRegion;
        this.traceData.properties.functionARN = originalContext.invokedFunctionArn;
        this.traceData.properties.logGroupName = originalContext.logGroupName;
        this.traceData.properties.logStreamName = originalContext.logStreamName;
        this.traceData.properties.requestId = originalContext.awsRequestId;
        this.traceData.properties.request = this.getRequest(originalEvent);
        this.traceData.properties.response = null;
    }

    afterInvocation = (data: any) => {
        let response = data.response;
        if (data.error) {
            const error = Utils.parseError(data.error);
            if (!(data.error instanceof HttpError)) {
                response = error;
            }

            if (data.error instanceof TimeoutError) {
                this.traceData.properties.timeout = 'true';
            }

            this.traceData.errors = [...this.traceData.errors, error.errorType];
            this.traceData.thrownError = error.errorType;
            this.traceData.auditInfo.errors = [...this.traceData.auditInfo.errors, error];
            this.traceData.auditInfo.thrownError = error;
        }
        const recorder: ThundraRecorder = this.tracer.getRecorder();
        const spanTree: SpanTreeNode = recorder.getSpanTree();
        this.traceData.auditInfo.children = this.generateAuditInfoFromTraces(spanTree);

        this.traceData.properties.response = this.getResponse(response);
        this.traceData.auditInfo.props.request = this.traceData.properties.request;
        this.traceData.auditInfo.props.response = this.traceData.properties.response;
        this.endTimestamp = Date.now();
        this.traceData.endTimestamp = this.traceData.auditInfo.closeTimestamp = this.endTimestamp;
        this.traceData.auditInfo.duration = this.endTimestamp - this.startTimestamp;
        this.traceData.auditInfo.aliveTime = this.endTimestamp - this.startTimestamp;
        this.traceData.duration = this.endTimestamp - this.startTimestamp;
        const reportData = Utils.generateReport(this.traceData, this.dataType, this.apiKey);
        this.report(reportData);

        this.tracer.destroy();
        this.instrumenter.unhookModuleCompile();

        for (const key of this.integrations.keys()) {
            this.integrations.get(key).unwrap();
        }
    }

    private generateAuditInfoFromTraces(spanTree: SpanTreeNode): AuditInfo[] {
        if (!spanTree) {
            return [];
        }
        const auditInfos: AuditInfo[] = [];
        const parentAuditInfo: AuditInfo = this.spanTreeToAuditInfo(spanTree);
        auditInfos.push(parentAuditInfo);
        return auditInfos;
    }

    private spanTreeToAuditInfo(spanTreeNode: SpanTreeNode): AuditInfo {
        const auditInfo: AuditInfo = new AuditInfo();
        auditInfo.id = Utils.generateId();
        auditInfo.errors = null;
        auditInfo.contextName = spanTreeNode.value.operationName;
        auditInfo.openTimestamp = spanTreeNode.value.startTime;
        if (spanTreeNode.value.getTag('error')) {
            const thrownError = new AuditInfoThrownError();
            thrownError.errorType = spanTreeNode.value.getTag('error.kind');
            thrownError.errorMessage = spanTreeNode.value.getTag('error.message');
            auditInfo.thrownError = thrownError;
            auditInfo.closeTimestamp = Date.now();
        } else {
            if (spanTreeNode.value.duration === undefined || spanTreeNode.value.duration === null) {
                auditInfo.closeTimestamp = Date.now();
                auditInfo.aliveTime = auditInfo.closeTimestamp - auditInfo.openTimestamp;
                auditInfo.duration = auditInfo.closeTimestamp - auditInfo.openTimestamp;
            } else {
                auditInfo.aliveTime = spanTreeNode.value.duration;
                auditInfo.duration = spanTreeNode.value.duration;
                auditInfo.closeTimestamp = spanTreeNode.value.startTime + spanTreeNode.value.duration;
            }
        }
        auditInfo.contextType = spanTreeNode.value.className;
        auditInfo.contextGroup = spanTreeNode.value.domainName;

        Object.keys(spanTreeNode.value.tags).forEach((key) => {
            auditInfo.props[key] = spanTreeNode.value.tags[key];
        });

        auditInfo.props[LOG_TAG_NAME] = spanTreeNode.value.logs;
        for (const node of spanTreeNode.children) {
            auditInfo.children.push(this.spanTreeToAuditInfo(node));
        }

        this.enrichAuditInfo(auditInfo);
        return auditInfo;
    }

    private getRequest(originalEvent: any): any {
        const conf = this.config;

        if (conf && conf.disableRequest) {
            return null;
        }

        if (conf && conf.maskRequest && typeof conf.maskRequest === 'function') {
            return conf.maskRequest.call(this, originalEvent);
        }

        return originalEvent;
    }

    private enrichAuditInfo(auditInfo: AuditInfo) {
        if (auditInfo.props[SpanTags.SPAN_TYPE]) {

            if (auditInfo.props[SpanTags.SPAN_TYPE] === SpanTypes.RDB) {
                auditInfo.props.databaseName = auditInfo.props[DBTags.DB_INSTANCE];
                auditInfo.props.query = auditInfo.props[DBTags.DB_STATEMENT];
                auditInfo.props.queryType = auditInfo.props[DBTags.DB_STATEMENT_TYPE];
                if (auditInfo.props[DBTags.DB_STATEMENT_TYPE] === 'SELECT') {
                    auditInfo.props.operationType = 'READ';
                } else {
                    auditInfo.props.operationType = 'UPDATE';
                }

                auditInfo.contextGroup = 'DB';
                auditInfo.contextType = SpanTypes.RDB;
                auditInfo.contextName = auditInfo.props[DBTags.DB_INSTANCE];
            }

            if (auditInfo.props[SpanTags.SPAN_TYPE] === SpanTypes.HTTP) {
                auditInfo.props.path = auditInfo.props[HttpTags.HTTP_PATH];
                auditInfo.props.method = auditInfo.props[HttpTags.HTTP_METHOD];
                auditInfo.props.operationTarget = auditInfo.props[HttpTags.HTTP_URL];
                auditInfo.props.statusCode = auditInfo.props[HttpTags.HTTP_STATUS];
                auditInfo.props.operationType = 'INVOKE';
                auditInfo.props.url = auditInfo.props[HttpTags.HTTP_URL];
                auditInfo.props.host = auditInfo.props[HttpTags.HTTP_HOST];

                if (auditInfo.props[DBTags.DB_STATEMENT_TYPE] === 'SELECT') {
                    auditInfo.props.operationType = 'UPDATE';
                } else {
                    auditInfo.props.operationType = 'READ';
                }

                auditInfo.contextGroup = 'API';
                auditInfo.contextType = SpanTypes.HTTP;
                auditInfo.contextName = auditInfo.props[HttpTags.HTTP_URL];
            }

            if (auditInfo.props[SpanTags.SPAN_TYPE] === SpanTypes.REDIS) {
                const commandArgs = auditInfo.props[RedisTags.REDIS_COMMAND_ARGS];
                auditInfo.props.host = auditInfo.props[RedisTags.REDIS_HOST];
                auditInfo.props.port = auditInfo.props[RedisTags.REDIS_PORT];
                auditInfo.props.operationType = auditInfo.props[RedisTags.REDIS_COMMAND_TYPE];
                auditInfo.props.commandType = auditInfo.props[RedisTags.REDIS_COMMAND];
                auditInfo.props.command = auditInfo.props[RedisTags.REDIS_COMMAND] + ` \"${commandArgs} \"`;
                auditInfo.props.operationTarget = auditInfo.props[RedisTags.REDIS_HOST];

                auditInfo.contextGroup = 'Cache';
                auditInfo.contextType = SpanTypes.REDIS;
                auditInfo.contextName = auditInfo.props[RedisTags.REDIS_HOST];
            }

            if (auditInfo.props[SpanTags.SPAN_TYPE] === SpanTypes.AWS_DYNAMO) {
                auditInfo.props.tableName = auditInfo.props[AwsDynamoTags.TABLE_NAME];
                auditInfo.props.operationType = auditInfo.props[SpanTags.OPERATION_TYPE];
                auditInfo.props.instanceName = auditInfo.props[AwsDynamoTags.TABLE_NAME];

                auditInfo.contextGroup = 'DB';
                auditInfo.contextType = SpanTypes.AWS_DYNAMO;
                auditInfo.contextName = auditInfo.props[AwsDynamoTags.TABLE_NAME];
            }

            if (auditInfo.props[SpanTags.SPAN_TYPE] === SpanTypes.AWS_SQS) {
                auditInfo.props.operationType = auditInfo.props[SpanTags.OPERATION_TYPE];
                auditInfo.props.queueName = auditInfo.props[AwsSQSTags.QUEUE_NAME];

                auditInfo.contextGroup = 'Messaging';
                auditInfo.contextType = SpanTypes.AWS_SQS;
                auditInfo.contextName = auditInfo.props[AwsSQSTags.QUEUE_NAME];
            }

            if (auditInfo.props[SpanTags.SPAN_TYPE] === SpanTypes.AWS_SNS) {
                auditInfo.props.operationType = auditInfo.props[SpanTags.OPERATION_TYPE];
                auditInfo.props.topicName = auditInfo.props[AwsSNSTags.TOPIC_NAME];

                auditInfo.contextGroup = 'Messaging';
                auditInfo.contextType = SpanTypes.AWS_SNS;
                auditInfo.contextName = auditInfo.props[AwsSNSTags.TOPIC_NAME];
            }

            if (auditInfo.props[SpanTags.SPAN_TYPE] === SpanTypes.AWS_KINESIS) {

                auditInfo.props.operationType = auditInfo.props[SpanTags.OPERATION_TYPE];
                auditInfo.props.streamName = auditInfo.props[AwsKinesisTags.STREAM_NAME];

                auditInfo.contextGroup = 'Stream';
                auditInfo.contextType = SpanTypes.AWS_KINESIS;
                auditInfo.contextName = auditInfo.props[AwsKinesisTags.STREAM_NAME];
            }

            if (auditInfo.props[SpanTags.SPAN_TYPE] === SpanTypes.AWS_S3) {
                auditInfo.props.operationType = auditInfo.props[SpanTags.OPERATION_TYPE];
                auditInfo.props.bucketName = auditInfo.props[AwsS3Tags.BUCKET_NAME];
                auditInfo.props.objectName = auditInfo.props[AwsS3Tags.OBJECT_NAME];

                auditInfo.contextGroup = 'Storage';
                auditInfo.contextType = SpanTypes.AWS_S3;
                auditInfo.contextName = auditInfo.props[AwsS3Tags.BUCKET_NAME];
            }

            if (auditInfo.props[SpanTags.SPAN_TYPE] === SpanTypes.AWS_LAMBDA) {
                auditInfo.props.functionName = auditInfo.props[AwsLambdaTags.FUNCTION_NAME];
                auditInfo.props.invocationType = auditInfo.props[AwsLambdaTags.INVOCATION_TYPE];
                auditInfo.props.qualifier = auditInfo.props[AwsLambdaTags.FUNCTION_QUALIFIER];
                auditInfo.props.request = auditInfo.props[AwsLambdaTags.INVOCATION_PAYLOAD];

                auditInfo.contextGroup = 'API';
                auditInfo.contextType = SpanTypes.AWS_LAMBDA;
                auditInfo.contextName = auditInfo.props[AwsLambdaTags.FUNCTION_NAME];
            }
        }
    }

    private getResponse(response: any): any {
        const conf = this.config;

        if (conf && conf.disableResponse) {
            return null;
        }

        if (conf && conf.maskResponse && typeof conf.maskResponse === 'function') {
            return conf.maskResponse.call(this, response);
        }

        return response;
    }
}

export default function instantiateTracePlugin(config: TraceConfig) {
    return new Trace(config);
}
