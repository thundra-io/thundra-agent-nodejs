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
import { ClientRequest } from 'http';

const shimmer = require('shimmer');
const Hook = require('require-in-the-middle');

class AWSIntegration implements Integration {
  version: string;
  lib: any;
  config: any;
  hook: any;
  basedir: string;

  constructor(config: any) {
    this.version = '2.x';

    this.hook = Hook('aws-sdk', { internals: true }, (exp: any, name: string, basedir: string) => {
      if (name === 'aws-sdk') {
        const moduleValidator = new ModuleVersionValidator();
        const isValidVersion = moduleValidator.validateModuleVersion(basedir, this.version);
        if (!isValidVersion) {
          ThundraLogger.getInstance().error(`Invalid module version for aws-sdk integration.
                                             Supported version is ${this.version}`);
        } else {
          this.lib = exp;
          this.config = config;
          this.basedir = basedir;
          this.wrap.call(this, exp, config);
        }
      }
      return exp;
    });
  }

  static injectSpanContextIntoMessageAttributes(tracer: ThundraTracer, span: ThundraSpan): any {
    if (!(Utils.getConfiguration(envVariableKeys.DISABLE_SPAN_CONTEXT_INJECTION) === 'true') ) {
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
    if (!(Utils.getConfiguration(envVariableKeys.DISABLE_SPAN_CONTEXT_INJECTION) === 'true') ) {
      const custom: any = {};
      tracer.inject(span.spanContext, opentracing.FORMAT_TEXT_MAP, custom);
      return custom;
    }
  }

  wrap(lib: any, config: any) {
    function wrapper(wrappedFunction: any) {
      return function AWSSDKWrapper(callback: any) {

        const tracer = ThundraTracer.getInstance();
        try {
          const request = this;
          const serviceEndpoint = request.service.config.endpoint;
          const serviceName = Utils.getServiceName(serviceEndpoint as string);
          const parentSpan = tracer.getActiveSpan();
          const originalCallback = callback;

          let activeSpan: ThundraSpan = null;

          const operationName = request.operation ? request.operation  : AWS_SERVICE_REQUEST;

          if (serviceName === 'sqs') {
            const operationType = SQSRequestTypes[operationName];
            const queueName = operationType ?
            Utils.getQueueName(request.params.QueueUrl) : AWS_SERVICE_REQUEST;

            activeSpan = tracer._startSpan(queueName, {
              childOf: parentSpan,
              domainName: DomainNames.MESSAGING,
              className: ClassNames.SQS,
              disableActiveStart: true,
              tags: {
                [SpanTags.SPAN_TYPE]: SpanTypes.AWS_SQS,
                [AwsSDKTags.REQUEST_NAME]: operationName,
                [AwsSQSTags.QUEUE_NAME]: queueName,
                [SpanTags.OPERATION_TYPE]: operationType ? operationType : 'READ',
              },
            });

            if (operationType) {
              activeSpan.setTag(SpanTags.TRIGGER_OPERATION_NAMES, [queueName]);
              activeSpan.setTag(SpanTags.TOPOLOGY_VERTEX, true);
              activeSpan.setTag(SpanTags.TRIGGER_DOMAIN_NAME, LAMBDA_APPLICATION_DOMAIN_NAME);
              activeSpan.setTag(SpanTags.TRIGGER_CLASS_NAME, LAMBDA_APPLICATION_CLASS_NAME);
            }

            const messageAttributes = AWSIntegration.injectSpanContextIntoMessageAttributes(tracer, activeSpan);
            if (messageAttributes) {
              if (operationName === 'sendMessage') {
                const requestMessageAttributes = request.params.MessageAttributes ? request.params.MessageAttributes : {};
                request.params.MessageAttributes = {...requestMessageAttributes, ...messageAttributes};
              } else if (operationName === 'sendMessageBatch' &&
                        request.params.Entries && Array.isArray(request.params.Entries)) {
                  for (const entry of request.params.Entries) {
                    const requestMessageAttributes = entry.MessageAttributes ? entry.MessageAttributes  : {};
                    entry.MessageAttributes = {...requestMessageAttributes, ...messageAttributes};
                  }
              }
            }
          } else if (serviceName === 'sns') {
            const operationType = SNSRequestTypes[operationName];
            const topicName = request.params ? request.params.TopicArn : AWS_SERVICE_REQUEST;

            activeSpan = tracer._startSpan(topicName, {
              childOf: parentSpan,
              domainName: DomainNames.MESSAGING,
              className: ClassNames.SNS,
              disableActiveStart: true,
              tags: {
                [SpanTags.SPAN_TYPE]: SpanTypes.AWS_SNS,
                [AwsSDKTags.REQUEST_NAME]: operationName,
                [AwsSNSTags.TOPIC_NAME]: topicName,
                [SpanTags.OPERATION_TYPE]: operationType ? operationType : 'READ',
              },
            });

            if (operationType) {
              activeSpan.setTag(SpanTags.TRIGGER_OPERATION_NAMES, [topicName]);
              activeSpan.setTag(SpanTags.TOPOLOGY_VERTEX, true);
              activeSpan.setTag(SpanTags.TRIGGER_DOMAIN_NAME, LAMBDA_APPLICATION_DOMAIN_NAME);
              activeSpan.setTag(SpanTags.TRIGGER_CLASS_NAME, LAMBDA_APPLICATION_CLASS_NAME);
            }

            if (operationName === 'publish') {
              const messageAttributes = AWSIntegration.injectSpanContextIntoMessageAttributes(tracer, activeSpan);
              if (messageAttributes) {
                  const requestMessageAttributes = request.params.MessageAttributes ?
                                                  request.params.MessageAttributes : {};
                  request.params.MessageAttributes = {...requestMessageAttributes, ...messageAttributes};
              }
            }
          } else if (serviceName === 'dynamodb') {
            const statementType = DynamoDBRequestTypes[operationName];
            const tableName = statementType ? Utils.getDynamoDBTableName(request) : AWS_SERVICE_REQUEST;

            activeSpan = tracer._startSpan(tableName, {
              childOf: parentSpan,
              domainName: DomainNames.DB,
              className: ClassNames.DYNAMODB,
              disableActiveStart: true,
              tags: {
                [DB_TYPE]: DBTypes.DYNAMODB,
                [DB_INSTANCE]: serviceEndpoint,
                [DBTags.DB_STATEMENT_TYPE]: statementType ? statementType : 'READ',
                [SpanTags.OPERATION_TYPE]: statementType ? statementType : 'READ',
                [SpanTags.SPAN_TYPE]: SpanTypes.AWS_DYNAMO,
                [AwsDynamoTags.TABLE_NAME]: tableName,
                [AwsSDKTags.REQUEST_NAME]: operationName,
                [DBTags.DB_STATEMENT]: request.params,
              },
            });

            if (statementType) {
              activeSpan.setTag(SpanTags.TRIGGER_OPERATION_NAMES, [tableName]);
              activeSpan.setTag(SpanTags.TOPOLOGY_VERTEX, true);
              activeSpan.setTag(SpanTags.TRIGGER_DOMAIN_NAME, LAMBDA_APPLICATION_DOMAIN_NAME);
              activeSpan.setTag(SpanTags.TRIGGER_CLASS_NAME, LAMBDA_APPLICATION_CLASS_NAME);
            }
          } else if (serviceName === 's3') {
            const operationType = S3RequestTypes[operationName];
            const bucketName = operationType ? request.params.Bucket : AWS_SERVICE_REQUEST;

            activeSpan = tracer._startSpan(bucketName, {
              childOf: parentSpan,
              domainName: DomainNames.STORAGE,
              className: ClassNames.S3,
              disableActiveStart: true,
              tags: {
                [SpanTags.SPAN_TYPE]: SpanTypes.AWS_S3,
                [SpanTags.OPERATION_TYPE]: operationType ? operationType : 'READ',
                [AwsS3Tags.BUCKET_NAME]: request.params.Bucket,
                [AwsSDKTags.REQUEST_NAME]: operationName,
                [AwsS3Tags.OBJECT_NAME]: request.params.Key,
              },
            });

            if (operationType) {
              activeSpan.setTag(SpanTags.TRIGGER_OPERATION_NAMES, [bucketName]);
              activeSpan.setTag(SpanTags.TOPOLOGY_VERTEX, true);
              activeSpan.setTag(SpanTags.TRIGGER_DOMAIN_NAME, LAMBDA_APPLICATION_DOMAIN_NAME);
              activeSpan.setTag(SpanTags.TRIGGER_CLASS_NAME, LAMBDA_APPLICATION_CLASS_NAME);
            }
          } else if (serviceName === 'lambda') {
            const operationType = LambdaRequestType[operationName];
            const lambdaName = operationType ? request.params.FunctionName : AWS_SERVICE_REQUEST;

            activeSpan = tracer._startSpan(lambdaName, {
              childOf: parentSpan,
              disableActiveStart: true,
              domainName: DomainNames.API,
              className: ClassNames.LAMBDA,
              tags: {
                [SpanTags.SPAN_TYPE]: SpanTypes.AWS_LAMBDA,
                [SpanTags.OPERATION_TYPE]: operationType,
                [AwsLambdaTags.FUNCTION_NAME]: lambdaName,
                [AwsLambdaTags.FUNCTION_QUALIFIER]: request.params.Qualifier,
                [AwsLambdaTags.INVOCATION_PAYLOAD]: request.params.Payload,
                [AwsSDKTags.REQUEST_NAME]: operationName,
                [AwsLambdaTags.INVOCATION_TYPE]: request.params.InvocationType,
              },
            });

            if (operationType) {
              activeSpan.setTag(SpanTags.TRIGGER_OPERATION_NAMES, [lambdaName]);
              activeSpan.setTag(SpanTags.TOPOLOGY_VERTEX, true);
              activeSpan.setTag(SpanTags.TRIGGER_DOMAIN_NAME, LAMBDA_APPLICATION_DOMAIN_NAME);
              activeSpan.setTag(SpanTags.TRIGGER_CLASS_NAME, LAMBDA_APPLICATION_CLASS_NAME);
            }

            const custom = AWSIntegration.injectSpanContexIntoLambdaClientContext(tracer, activeSpan);
            if (custom) {
              if (request.params.ClientContext) {
                const context = Buffer.from(request.params.ClientContext, 'base64').toString('utf8');
                try {
                  const clientContext = JSON.parse(context);
                  clientContext.custom = custom;
                  request.params.ClientContext = Buffer.from(JSON.stringify({custom: clientContext})).toString('base64');
                } catch (err) {
                  ThundraLogger.getInstance().debug('Cannot parse lambda client context not a valid JSON');
                }
              } else {
                request.params.ClientContext = Buffer.from(JSON.stringify({custom})).toString('base64');
              }
            }
          } else if (serviceName === 'kinesis') {
            const streamName = request.params ? request.params.StreamName : AWS_SERVICE_REQUEST;

            activeSpan = tracer._startSpan(streamName, {
              childOf: parentSpan,
              domainName: DomainNames.STREAM,
              className: ClassNames.KINESIS,
              disableActiveStart: true,
              tags: {
                [SpanTags.OPERATION_TYPE]: KinesisRequestTypes[operationName] ?
                  KinesisRequestTypes[operationName] : 'READ',
                [SpanTags.SPAN_TYPE]: SpanTypes.AWS_KINESIS,
                [AwsSDKTags.REQUEST_NAME]: operationName,
                [AwsKinesisTags.STREAM_NAME]: streamName,
              },
            });

            if (request.params.StreamName) {
              activeSpan.setTag(SpanTags.TRIGGER_OPERATION_NAMES, [streamName]);
              activeSpan.setTag(SpanTags.TOPOLOGY_VERTEX, true);
              activeSpan.setTag(SpanTags.TRIGGER_DOMAIN_NAME, LAMBDA_APPLICATION_DOMAIN_NAME);
              activeSpan.setTag(SpanTags.TRIGGER_CLASS_NAME, LAMBDA_APPLICATION_CLASS_NAME);
            }
          } else if (serviceName === 'firehose') {
            const streamName = request.params ? request.params.DeliveryStreamName : AWS_SERVICE_REQUEST;
            activeSpan = tracer._startSpan(streamName, {
              childOf: parentSpan,
              domainName: DomainNames.STREAM,
              className: ClassNames.FIREHOSE,
              disableActiveStart: true,
              tags: {
                [SpanTags.OPERATION_TYPE]: FirehoseRequestTypes[operationName] ?
                  FirehoseRequestTypes[operationName] : 'READ',
                [SpanTags.SPAN_TYPE]: SpanTypes.AWS_FIREHOSE,
                [AwsSDKTags.REQUEST_NAME]: operationName,
                [AwsFirehoseTags.STREAM_NAME]: streamName,
              },
            });

            if (request.params.DeliveryStreamName) {
              activeSpan.setTag(SpanTags.TRIGGER_OPERATION_NAMES, [streamName]);
              activeSpan.setTag(SpanTags.TOPOLOGY_VERTEX, true);
              activeSpan.setTag(SpanTags.TRIGGER_DOMAIN_NAME, LAMBDA_APPLICATION_DOMAIN_NAME);
              activeSpan.setTag(SpanTags.TRIGGER_CLASS_NAME, LAMBDA_APPLICATION_CLASS_NAME);
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

          request.on('complete', (response: any) => {
            if (activeSpan) {
              activeSpan.close();
            }
            if (response.error !== null) {
              const parseError = Utils.parseError(response.error );
              activeSpan.setTag('error', true);
              activeSpan.setTag('error.kind', parseError.errorType);
              activeSpan.setTag('error.message', parseError.errorMessage);
              activeSpan.setTag('error.stack', parseError.stack);
              activeSpan.setTag('error.code', parseError.code);
            }
          });

          return wrappedFunction.apply(this, [originalCallback]);

        } catch (error) {
          ThundraLogger.getInstance().error(error);
        }
      };
    }

    shimmer.wrap(lib.Request.prototype, 'send', wrapper);
    shimmer.wrap(lib.Request.prototype, 'promise', wrapper);
  }

  unwrap() {
    shimmer.unwrap(this.lib.Request.prototype, 'send');
    shimmer.unwrap(this.lib.Request.prototype, 'promise');
    this.hook.unhook();
  }
}

export default AWSIntegration;
