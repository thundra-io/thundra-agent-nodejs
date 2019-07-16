import Integration from './Integration';
import ThundraTracer from '../../opentracing/Tracer';
import {
    AwsSDKTags, AwsSQSTags, AwsSNSTags, SpanTags, AwsDynamoTags,
    SNSRequestTypes, SQSRequestTypes, AwsKinesisTags, AwsS3Tags, AwsLambdaTags,
    SpanTypes, DynamoDBRequestTypes, KinesisRequestTypes, ClassNames, DomainNames,
    DBTags, DBTypes, FirehoseRequestTypes, AwsFirehoseTags, AWS_SERVICE_REQUEST, S3RequestTypes,
    LambdaRequestType, envVariableKeys, LAMBDA_APPLICATION_DOMAIN_NAME, LAMBDA_APPLICATION_CLASS_NAME,
} from '../../Constants';
import Utils from '../utils/Utils';
import { DB_INSTANCE, DB_TYPE } from 'opentracing/lib/ext/tags';
import ThundraLogger from '../../ThundraLogger';
import ModuleVersionValidator from './ModuleVersionValidator';
import ThundraSpan from '../../opentracing/Span';
import * as opentracing from 'opentracing';
import LambdaEventUtils from '../utils/LambdaEventUtils';
import InvocationSupport from '../support/InvocationSupport';
import ThundraChaosError from '../error/ThundraChaosError';

const shimmer = require('shimmer');
const Hook = require('require-in-the-middle');
const koalas = require('koalas');
const md5 = require('md5');
const has = require('lodash.has');
const trim = require('lodash.trim');
const get = require('lodash.get');
const thundraWrapped = '__thundra_wrapped';

const moduleName = 'aws-sdk';

class AWSIntegration implements Integration {
    version: string;
    lib: any;
    config: any;
    basedir: string;
    wrappedFuncs: any;
    wrapped: boolean;
    hook: any;

    constructor(config: any) {
        this.version = '2.x';
        this.wrappedFuncs = {};
        this.config = config;
        this.lib = Utils.tryRequire(moduleName);
        if (this.lib) {
            const { basedir } = Utils.getModuleInfo(moduleName);
            if (!basedir) {
                ThundraLogger.getInstance().error(`Base directory is not found for the package ${moduleName}`);
                return;
            }
            const moduleValidator = new ModuleVersionValidator();
            const isValidVersion = moduleValidator.validateModuleVersion(basedir, this.version);
            if (!isValidVersion) {
                ThundraLogger.getInstance().error(`Invalid module version for ${moduleName} integration.
                                                    Supported version is ${this.version}`);
                return;
            } else {
                this.basedir = basedir;
                this.wrap.call(this, this.lib, config);
            }
        }

        // If instrumentAWSOnLoad is set, enable the hook
        if (this.config.instrumentAWSOnLoad) {
            this.hook = Hook('aws-sdk', { internals: true }, (exp: any, name: string, basedir: string) => {
                if (name === 'aws-sdk') {
                    const moduleValidator = new ModuleVersionValidator();
                    const isValidVersion = moduleValidator.validateModuleVersion(basedir, this.version);
                    if (!isValidVersion) {
                        ThundraLogger.getInstance().error(`Invalid module version for ${moduleName} integration.
                                                          Supported version is ${this.version}`);
                    } else {
                        this.lib = exp;
                        this.basedir = basedir;
                        this.wrap.call(this, exp, config);
                    }
                }
                return exp;
            });
        }
    }

    static injectSpanContextIntoMessageAttributes(tracer: ThundraTracer, span: ThundraSpan): any {
        if (!(Utils.getConfiguration(envVariableKeys.DISABLE_SPAN_CONTEXT_INJECTION) === 'true')) {
            const attributes: any = {};
            tracer.inject(span.spanContext, opentracing.FORMAT_TEXT_MAP, attributes);
            const messageAttributes: any = {};
            for (const key of Object.keys(attributes)) {
                messageAttributes[key] = {
                    DataType: 'String',
                    StringValue: attributes[key],
                };
            }
            return messageAttributes;
        }
    }

    static injectSpanContexIntoLambdaClientContext(tracer: ThundraTracer, span: ThundraSpan): any {
        if (!(Utils.getConfiguration(envVariableKeys.DISABLE_SPAN_CONTEXT_INJECTION) === 'true')) {
            const custom: any = {};
            tracer.inject(span.spanContext, opentracing.FORMAT_TEXT_MAP, custom);
            return custom;
        }
    }

    static injectDynamoDBTraceLinkOnPut(requestParams: any, span: ThundraSpan): void {
        const spanId = span.spanContext.spanId;
        requestParams.Item = Object.assign({},
            { 'x-thundra-span-id': { S: spanId } },
            requestParams.Item,
        );
        span.setTag(SpanTags.TRACE_LINKS, [`SAVE:${spanId}`]);
    }

    static injectDynamoDBTraceLinkOnUpdate(requestParams: any, span: ThundraSpan): void {
        const spanId = span.spanContext.spanId;
        if (has(requestParams, 'AttributeUpdates')) {
            const thundraAttr = {
                Action: 'PUT',
                Value: { S: spanId },
            };

            requestParams.AttributeUpdates = Object.assign({},
                { 'x-thundra-span-id': thundraAttr },
                requestParams.AttributeUpdates,
            );

            span.setTag(SpanTags.TRACE_LINKS, [`SAVE:${spanId}`]);
        } else if (has(requestParams, 'UpdateExpression')) {
            const exp: string = requestParams.UpdateExpression;
            const thundraAttrName = { '#xThundraSpanId': 'x-thundra-span-id' };
            const thundraAttrVal = { ':xThundraSpanId': { S: spanId } };

            requestParams.ExpressionAttributeNames = Object.assign({}, requestParams.ExpressionAttributeNames, thundraAttrName);
            requestParams.ExpressionAttributeValues = Object.assign({}, requestParams.ExpressionAttributeValues, thundraAttrVal);

            if (exp.indexOf('SET') < 0) {
                requestParams.UpdateExpression = `SET #xThundraSpanId = :xThundraSpanId ${exp}`;
            } else {
                requestParams.UpdateExpression = exp.replace(/SET (.+)/, `SET #xThundraSpanId = :xThundraSpanId, $1`);
            }

            span.setTag(SpanTags.TRACE_LINKS, [`SAVE:${spanId}`]);
        }
    }

    static serializeAttributes(attributes: any): string {
        return Object.keys(attributes).sort().map((attrKey) => {
            const attrType = Object.keys(attributes[attrKey])[0];
            const attrVal = trim(JSON.stringify(attributes[attrKey][attrType]), '"');
            return `${attrKey}={${attrType}: ${attrVal}}`;
        }).join(', ');
    }

    static injectDynamoDBTraceLinkOnDelete(requestParams: any): void {
        requestParams.ReturnValues = 'ALL_OLD';
    }

    static generateDynamoTraceLinks(attributes: any, operationType: string, tableName: string, region: string,
                                    timestamp: number): any[] {
        if (attributes) {
            const attrHash = md5(AWSIntegration.serializeAttributes(attributes));
            return [0, 1, 2].map((i) => `${region}:${tableName}:${timestamp + i}:${operationType}:${attrHash}`);
        }
        return [];
    }

    static generateFirehoseTraceLinks(region: string, deliveryStreamName: string, timestamp: number, data: any) {
        try {
            if (data) {
                const dataHash = md5(data);
                return [0, 1, 2].map((i) => `${region}:${deliveryStreamName}:${timestamp + i}:${dataHash}`);
            }
        } catch (e) {
            // Pass
        }
        return [];
    }

    static injectTraceLink(span: ThundraSpan, req: any, config: any): void {
        try {
            if (span.getTag(SpanTags.TRACE_LINKS) || !req) {
                return;
            }
            const region = get(req, 'service.config.region', '');
            const serviceEndpoint = get(req, 'service.config.endpoint', '');
            const serviceName = Utils.getServiceName(serviceEndpoint as string);
            const operationName = req.operation;
            const response = req.response;
            const params = Object.assign({}, req.params);
            let traceLinks: any[] = [];

            if (serviceName === 'dynamodb') {
                const tableName = Utils.getDynamoDBTableName(req);
                let timestamp: number;
                if (has(response, 'httpResponse.headers.date')) {
                    timestamp = Date.parse(response.httpResponse.headers.date) / 1000;
                } else {
                    timestamp = Math.floor(Date.now() / 1000) - 1;
                }

                if (operationName === 'putItem') {
                    traceLinks = AWSIntegration.generateDynamoTraceLinks(params.Item, 'SAVE', tableName, region, timestamp);
                } else if (operationName === 'updateItem') {
                    traceLinks = AWSIntegration.generateDynamoTraceLinks(params.Key, 'SAVE', tableName, region, timestamp);
                } else if (operationName === 'deleteItem') {
                    if (config.dynamoDBTraceInjectionEnabled && has(response, 'data.Attributes.x-thundra-span-id')) {
                        const spanId = response.data.Attributes['x-thundra-span-id'];
                        traceLinks = [`DELETE:${spanId}`];
                    } else {
                        traceLinks = AWSIntegration.generateDynamoTraceLinks(params.Key, 'DELETE', tableName, region, timestamp);
                    }
                }
            } else if (serviceName === 'sqs') {
                if (operationName === 'sendMessage') {
                    const messageId = response.data.MessageId || '';
                    traceLinks = [messageId];
                } else if (operationName === 'sendMessageBatch') {
                    const entries = response.data.Successful || [];
                    entries.map((entry: any) => traceLinks.push(entry.MessageId));
                }
            } else if (serviceName === 'sns') {
                const messageId = get(response, 'data.MessageId', false);
                if (messageId) {
                    traceLinks = [messageId];
                }
            } else if (serviceName === 'kinesis') {
                const records = get(response, 'data.Records', false);
                const streamName = params.StreamName || '';
                if (records) {
                    for (const record of records) {
                        const shardId = get(record, 'ShardId', false);
                        const seqNumber = get(record, 'SequenceNumber', false);
                        if (shardId && seqNumber) {
                            traceLinks.push(`${region}:${streamName}:${shardId}:${seqNumber}`);
                        }
                    }
                } else {
                    const shardId = get(response, 'data.ShardId', false);
                    const seqNumber = get(response, 'data.SequenceNumber', false);
                    if (shardId && seqNumber) {
                        traceLinks = [`${region}:${streamName}:${shardId}:${seqNumber}`];
                    }
                }
            } else if (serviceName === 's3') {
                const requestId = get(response, 'httpResponse.headers.x-amz-request-id', false);
                if (requestId) {
                    traceLinks = [requestId];
                }
            } else if (serviceName === 'lambda') {
                const requestId = get(response, 'httpResponse.headers.x-amzn-requestid', false);
                if (requestId) {
                    traceLinks = [requestId];
                }
            } else if (serviceName === 'firehose') {
                const deliveryStreamName = params.DeliveryStreamName || '';
                let timestamp: number;
                if (has(response, 'httpResponse.headers.date')) {
                    timestamp = Date.parse(response.httpResponse.headers.date) / 1000;
                } else {
                    timestamp = Math.floor(Date.now() / 1000) - 1;
                }

                if (operationName === 'putRecord') {
                    const data = get(params, 'Record.Data', false);
                    if (data) {
                        traceLinks = AWSIntegration.generateFirehoseTraceLinks(region, deliveryStreamName, timestamp, data);
                    }
                } else if (operationName === 'putRecordBatch') {
                    const records = params.Records || [];
                    for (const record of records) {
                        const data = record.Data;
                        if (data) {
                            traceLinks.push(...AWSIntegration.
                                generateFirehoseTraceLinks(region, deliveryStreamName, timestamp, data));
                        }
                    }
                }
            }

            if (traceLinks.length > 0) {
                span.setTag(SpanTags.TRACE_LINKS, traceLinks);
            }
        } catch (error) {
            ThundraLogger.getInstance().debug(`Error while injecting trace links, ${error}`);
        }
    }

    wrap(lib: any, config: any) {
        const integration = this;
        function wrapper(wrappedFunction: any, wrappedFunctionName: string) {
            integration.wrappedFuncs[wrappedFunctionName] = wrappedFunction;
            return function AWSSDKWrapper(callback: any) {

                let activeSpan: ThundraSpan;
                try {
                    const tracer = ThundraTracer.getInstance();

                    if (!tracer) {
                        return wrappedFunction.apply(this, [callback]);
                    }

                    const request = this;
                    const serviceEndpoint = request.service.config.endpoint;
                    const serviceName = Utils.getServiceName(serviceEndpoint as string);
                    const parentSpan = tracer.getActiveSpan();
                    const originalCallback = callback;
                    const functionName = InvocationSupport.getFunctionName();

                    request.params = request.params ? request.params : {};

                    const operationName = request.operation ? request.operation : AWS_SERVICE_REQUEST;

                    if (serviceName === 'sqs') {
                        const operationType = SQSRequestTypes[operationName];
                        let queueName = Utils.getQueueName(request.params.QueueUrl);
                        queueName = queueName ? queueName.substring(queueName.lastIndexOf('/') + 1) : queueName;

                        const spanName = koalas(queueName, AWS_SERVICE_REQUEST);
                        activeSpan = tracer._startSpan(spanName, {
                            childOf: parentSpan,
                            domainName: DomainNames.MESSAGING,
                            className: ClassNames.SQS,
                            disableActiveStart: true,
                            tags: {
                                [SpanTags.SPAN_TYPE]: SpanTypes.AWS_SQS,
                                [AwsSDKTags.REQUEST_NAME]: operationName,
                                [SpanTags.OPERATION_TYPE]: operationType ? operationType : '',
                            },
                        });

                        if (operationType) {
                            activeSpan.setTag(SpanTags.TRIGGER_OPERATION_NAMES, [functionName]);
                            activeSpan.setTag(SpanTags.TOPOLOGY_VERTEX, true);
                            activeSpan.setTag(SpanTags.TRIGGER_DOMAIN_NAME, LAMBDA_APPLICATION_DOMAIN_NAME);
                            activeSpan.setTag(SpanTags.TRIGGER_CLASS_NAME, LAMBDA_APPLICATION_CLASS_NAME);

                            activeSpan.setTag(AwsSQSTags.QUEUE_NAME, queueName);
                        }

                        const messageAttributes = AWSIntegration.injectSpanContextIntoMessageAttributes(tracer, activeSpan);
                        if (operationName === 'sendMessage') {
                            if (messageAttributes) {
                                const requestMessageAttributes = request.params.MessageAttributes || {};
                                request.params.MessageAttributes = { ...requestMessageAttributes, ...messageAttributes };
                            }

                            if (!config.maskSQSMessage) {
                                activeSpan.setTag(AwsSQSTags.MESSAGE, request.params.MessageBody);
                            }
                        } else if (operationName === 'sendMessageBatch' &&
                            request.params.Entries && Array.isArray(request.params.Entries)) {
                            const messages: any = [];

                            for (const entry of request.params.Entries) {
                                if (messageAttributes) {
                                    const requestMessageAttributes = entry.MessageAttributes ? entry.MessageAttributes : {};
                                    entry.MessageAttributes = { ...requestMessageAttributes, ...messageAttributes };
                                }
                                messages.push(entry.MessageBody);
                            }

                            if (!config.maskSQSMessage) {
                                activeSpan.setTag(AwsSQSTags.MESSAGES, messages);
                            }
                        }
                    } else if (serviceName === 'sns') {
                        const operationType = SNSRequestTypes[operationName];

                        let spanName = null;
                        let topicName = null;
                        let targetName = null;
                        let phoneNumber = null;
                        if (request.params.TopicArn) {
                            topicName = request.params.TopicArn.substring(request.params.TopicArn.lastIndexOf(':') + 1);
                            spanName = topicName;
                        }
                        if (!spanName && request.params.TargetArn) {
                            targetName = request.params.TargetArn.substring(request.params.TargetArn.lastIndexOf(':') + 1);
                            spanName = targetName;
                        }
                        if (!spanName && request.params.PhoneNumber) {
                            phoneNumber = request.params.PhoneNumber;
                            spanName = phoneNumber;
                        }
                        spanName = koalas(spanName, AWS_SERVICE_REQUEST);

                        activeSpan = tracer._startSpan(spanName, {
                            childOf: parentSpan,
                            domainName: DomainNames.MESSAGING,
                            className: ClassNames.SNS,
                            disableActiveStart: true,
                            tags: {
                                [SpanTags.SPAN_TYPE]: SpanTypes.AWS_SNS,
                                [AwsSDKTags.REQUEST_NAME]: operationName,
                                [SpanTags.OPERATION_TYPE]: operationType ? operationType : '',
                            },
                        });

                        if (operationType) {
                            activeSpan.setTag(SpanTags.TRIGGER_OPERATION_NAMES, [functionName]);
                            activeSpan.setTag(SpanTags.TOPOLOGY_VERTEX, true);
                            activeSpan.setTag(SpanTags.TRIGGER_DOMAIN_NAME, LAMBDA_APPLICATION_DOMAIN_NAME);
                            activeSpan.setTag(SpanTags.TRIGGER_CLASS_NAME, LAMBDA_APPLICATION_CLASS_NAME);

                            if (topicName) {
                                activeSpan.setTag(AwsSNSTags.TOPIC_NAME, topicName);
                            }
                            if (targetName) {
                                activeSpan.setTag(AwsSNSTags.TARGET_NAME, targetName);
                            }
                            if (phoneNumber) {
                                activeSpan.setTag(AwsSNSTags.SMS_PHONE_NUMBER, phoneNumber);
                            }
                            if (config && !config.maskSNSMessage) {
                                activeSpan.setTag(AwsSNSTags.MESSAGE, request.params.Message);
                            }
                        }

                        if (operationName === 'publish') {
                            const messageAttributes = AWSIntegration.injectSpanContextIntoMessageAttributes(tracer, activeSpan);
                            if (messageAttributes) {
                                const requestMessageAttributes = request.params.MessageAttributes ?
                                    request.params.MessageAttributes : {};
                                request.params.MessageAttributes = { ...requestMessageAttributes, ...messageAttributes };
                            }
                        }
                    } else if (serviceName === 'dynamodb') {
                        const statementType = DynamoDBRequestTypes[operationName];
                        const tableName = Utils.getDynamoDBTableName(request);

                        const spanName = koalas(tableName, AWS_SERVICE_REQUEST);

                        activeSpan = tracer._startSpan(spanName, {
                            childOf: parentSpan,
                            domainName: DomainNames.DB,
                            className: ClassNames.DYNAMODB,
                            disableActiveStart: true,
                            tags: {
                                [DB_TYPE]: DBTypes.DYNAMODB,
                                [DB_INSTANCE]: serviceEndpoint,
                                [DBTags.DB_STATEMENT_TYPE]: statementType ? statementType : '',
                                [SpanTags.OPERATION_TYPE]: statementType ? statementType : '',
                                [SpanTags.SPAN_TYPE]: SpanTypes.AWS_DYNAMO,
                                [AwsSDKTags.REQUEST_NAME]: operationName,
                                [DBTags.DB_STATEMENT]: config.maskDynamoDBStatement ? undefined : { ...request.params },
                            },
                        });

                        if (statementType) {
                            activeSpan.setTag(SpanTags.TRIGGER_OPERATION_NAMES, [functionName]);
                            activeSpan.setTag(SpanTags.TOPOLOGY_VERTEX, true);
                            activeSpan.setTag(SpanTags.TRIGGER_DOMAIN_NAME, LAMBDA_APPLICATION_DOMAIN_NAME);
                            activeSpan.setTag(SpanTags.TRIGGER_CLASS_NAME, LAMBDA_APPLICATION_CLASS_NAME);
                            activeSpan.setTag(AwsDynamoTags.TABLE_NAME, tableName);
                        }

                        // Inject outgoing trace links into spans
                        if (config.dynamoDBTraceInjectionEnabled) {
                            if (operationName === 'putItem') {
                                AWSIntegration.injectDynamoDBTraceLinkOnPut(request.params, activeSpan);
                            } else if (operationName === 'updateItem') {
                                AWSIntegration.injectDynamoDBTraceLinkOnUpdate(request.params, activeSpan);
                            } else if (operationName === 'deleteItem') {
                                AWSIntegration.injectDynamoDBTraceLinkOnDelete(request.params);
                            }
                        }
                    } else if (serviceName === 's3') {
                        const operationType = S3RequestTypes[operationName];
                        const spanName = koalas(request.params.Bucket, AWS_SERVICE_REQUEST);

                        activeSpan = tracer._startSpan(spanName, {
                            childOf: parentSpan,
                            domainName: DomainNames.STORAGE,
                            className: ClassNames.S3,
                            disableActiveStart: true,
                            tags: {
                                [SpanTags.SPAN_TYPE]: SpanTypes.AWS_S3,
                                [SpanTags.OPERATION_TYPE]: operationType ? operationType : '',
                                [AwsS3Tags.BUCKET_NAME]: request.params.Bucket,
                                [AwsSDKTags.REQUEST_NAME]: operationName,
                            },
                        });

                        if (operationType) {
                            activeSpan.setTag(SpanTags.TRIGGER_OPERATION_NAMES, [functionName]);
                            activeSpan.setTag(SpanTags.TOPOLOGY_VERTEX, true);
                            activeSpan.setTag(SpanTags.TRIGGER_DOMAIN_NAME, LAMBDA_APPLICATION_DOMAIN_NAME);
                            activeSpan.setTag(SpanTags.TRIGGER_CLASS_NAME, LAMBDA_APPLICATION_CLASS_NAME);
                            activeSpan.setTag(AwsS3Tags.OBJECT_NAME, request.params.Key);
                        }
                    } else if (serviceName === 'lambda') {
                        const operationType = LambdaRequestType[operationName];
                        const spanName = koalas(request.params.FunctionName, AWS_SERVICE_REQUEST);

                        activeSpan = tracer._startSpan(spanName, {
                            childOf: parentSpan,
                            disableActiveStart: true,
                            domainName: DomainNames.API,
                            className: ClassNames.LAMBDA,
                            tags: {
                                [SpanTags.SPAN_TYPE]: SpanTypes.AWS_LAMBDA,
                                [SpanTags.OPERATION_TYPE]: operationType,
                                [AwsLambdaTags.FUNCTION_QUALIFIER]: request.params.Qualifier,
                                [AwsLambdaTags.INVOCATION_PAYLOAD]: config.maskLambdaPayload ? undefined : request.params.Payload,
                                [AwsSDKTags.REQUEST_NAME]: operationName,
                                [AwsLambdaTags.INVOCATION_TYPE]: request.params.InvocationType,
                            },
                        });

                        const custom = AWSIntegration.injectSpanContexIntoLambdaClientContext(tracer, activeSpan);

                        if (operationType) {
                            custom[LambdaEventUtils.LAMBDA_TRIGGER_OPERATION_NAME] = functionName;
                            activeSpan.setTag(SpanTags.TRIGGER_OPERATION_NAMES, [functionName]);
                            activeSpan.setTag(SpanTags.TOPOLOGY_VERTEX, true);
                            activeSpan.setTag(SpanTags.TRIGGER_DOMAIN_NAME, LAMBDA_APPLICATION_DOMAIN_NAME);
                            activeSpan.setTag(SpanTags.TRIGGER_CLASS_NAME, LAMBDA_APPLICATION_CLASS_NAME);

                            activeSpan.setTag(AwsLambdaTags.FUNCTION_NAME, spanName);
                        }

                        if (custom && operationName && operationName.includes && operationName.includes('invoke')) {
                            if (request.params.ClientContext) {
                                const context = Buffer.from(request.params.ClientContext, 'base64').toString('utf8');
                                try {
                                    const clientContext = JSON.parse(context);
                                    clientContext.custom = custom;
                                    request.params.ClientContext = Buffer.from(
                                        JSON.stringify({ custom: clientContext })).toString('base64');
                                } catch (err) {
                                    ThundraLogger.getInstance().debug('Cannot parse lambda client context not a valid JSON');
                                }
                            } else {
                                request.params.ClientContext = Buffer.from(JSON.stringify({ custom })).toString('base64');
                            }
                        }
                    } else if (serviceName === 'kinesis') {
                        const spanName = koalas(request.params.StreamName, AWS_SERVICE_REQUEST);

                        activeSpan = tracer._startSpan(spanName, {
                            childOf: parentSpan,
                            domainName: DomainNames.STREAM,
                            className: ClassNames.KINESIS,
                            disableActiveStart: true,
                            tags: {
                                [SpanTags.OPERATION_TYPE]: KinesisRequestTypes[operationName] ?
                                    KinesisRequestTypes[operationName] : '',
                                [SpanTags.SPAN_TYPE]: SpanTypes.AWS_KINESIS,
                                [AwsSDKTags.REQUEST_NAME]: operationName,
                            },
                        });

                        if (request.params.StreamName) {
                            activeSpan.setTag(SpanTags.TRIGGER_OPERATION_NAMES, [functionName]);
                            activeSpan.setTag(SpanTags.TOPOLOGY_VERTEX, true);
                            activeSpan.setTag(SpanTags.TRIGGER_DOMAIN_NAME, LAMBDA_APPLICATION_DOMAIN_NAME);
                            activeSpan.setTag(SpanTags.TRIGGER_CLASS_NAME, LAMBDA_APPLICATION_CLASS_NAME);

                            activeSpan.setTag(AwsKinesisTags.STREAM_NAME, request.params.StreamName);
                        }
                    } else if (serviceName === 'firehose') {
                        const spanName = koalas(request.params.DeliveryStreamName, AWS_SERVICE_REQUEST);

                        activeSpan = tracer._startSpan(spanName, {
                            childOf: parentSpan,
                            domainName: DomainNames.STREAM,
                            className: ClassNames.FIREHOSE,
                            disableActiveStart: true,
                            tags: {
                                [SpanTags.OPERATION_TYPE]: FirehoseRequestTypes[operationName] ?
                                    FirehoseRequestTypes[operationName] : '',
                                [SpanTags.SPAN_TYPE]: SpanTypes.AWS_FIREHOSE,
                                [AwsSDKTags.REQUEST_NAME]: operationName,
                            },
                        });

                        if (request.params.DeliveryStreamName) {
                            activeSpan.setTag(SpanTags.TRIGGER_OPERATION_NAMES, [functionName]);
                            activeSpan.setTag(SpanTags.TOPOLOGY_VERTEX, true);
                            activeSpan.setTag(SpanTags.TRIGGER_DOMAIN_NAME, LAMBDA_APPLICATION_DOMAIN_NAME);
                            activeSpan.setTag(SpanTags.TRIGGER_CLASS_NAME, LAMBDA_APPLICATION_CLASS_NAME);

                            activeSpan.setTag(AwsFirehoseTags.STREAM_NAME, request.params.DeliveryStreamName);
                        }
                    } else {
                        activeSpan = tracer._startSpan(AWS_SERVICE_REQUEST, {
                            childOf: parentSpan,
                            domainName: DomainNames.AWS,
                            className: ClassNames.AWSSERVICE,
                            disableActiveStart: true,
                            tags: {
                                [AwsSDKTags.SERVICE_NAME]: serviceName,
                                [AwsSDKTags.REQUEST_NAME]: request.operation,
                            },
                        });
                    }
                    const originalFunction = integration.wrappedFuncs[wrappedFunctionName];

                    if (originalCallback) {
                        const me = this;
                        const wrappedCallback = (err: any, data: any) => {
                            if (err && activeSpan) {
                                activeSpan.setErrorTag(err);
                            }
                            if (data) {
                                AWSIntegration.injectTraceLink(activeSpan, request, config);
                            }
                            if (activeSpan) {
                                activeSpan.closeWithCallback(me, originalCallback, [err, data]);
                            }
                        };

                        return originalFunction.apply(this, [wrappedCallback]);
                    } else {
                        request.on('error', (error: any) => {
                            if (error && activeSpan) {
                                activeSpan.setErrorTag(error);
                                if (error.injectedByThundra) {
                                    activeSpan.close();
                                }
                            }
                        }).on('complete', (response: any) => {
                            if (response) {
                                AWSIntegration.injectTraceLink(activeSpan, request, config);
                            }
                            if (activeSpan) {
                                try {
                                    activeSpan.close();
                                } catch (error) {
                                    if (error instanceof ThundraChaosError) {
                                        request.emit('error', error);
                                    } else {
                                        ThundraLogger.getInstance().error(error);
                                    }
                                }
                            }
                        });

                        return originalFunction.apply(this, [originalCallback]);
                    }
                } catch (error) {
                    if (error instanceof ThundraChaosError) {
                        this.response.error = error;
                    } else {
                        ThundraLogger.getInstance().error(error);
                    }

                    const originalFunction = integration.wrappedFuncs[wrappedFunctionName];
                    if (activeSpan) {
                        activeSpan.close();
                    }
                    return originalFunction.apply(this, [callback]);
                }
            };
        }

        // Double wrapping a method causes infinite loops in unit tests
        // To prevent this we first need to return to the original method
        if (this.isWrapped(lib)) {
            this.unwrap();
        }

        if (has(lib, 'Request.prototype.send') && has(lib, 'Request.prototype.promise')) {
            shimmer.wrap(lib.Request.prototype, 'send', (wrapped: Function) => wrapper(wrapped, 'send'));
            shimmer.wrap(lib.Request.prototype, 'promise', (wrapped: Function) => wrapper(wrapped, 'promise'));
            this.setWrapped(lib);
        }
    }

    setWrapped(lib: any) {
        if (this.lib) {
            lib[thundraWrapped] = true;
        }
    }

    setUnwrapped(lib: any) {
        if (this.lib) {
            delete lib[thundraWrapped];
        }
    }

    isWrapped(lib: any) {
        return get(lib, thundraWrapped, false);
    }

    unhook() {
        if (this.config.instrumentAWSOnLoad) {
            this.hook.unhook();
        }
    }

    unwrap() {
        if (has(this.lib, 'Request.prototype.send') && has(this.lib, 'Request.prototype.promise')) {
            shimmer.unwrap(this.lib.Request.prototype, 'send');
            shimmer.unwrap(this.lib.Request.prototype, 'promise');
            this.setWrapped(this.lib);
        }
    }
}

export default AWSIntegration;
