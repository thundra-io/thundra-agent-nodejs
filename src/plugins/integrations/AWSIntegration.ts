import Integration from './Integration';
import ThundraTracer from '../../opentracing/Tracer';
import {
  AwsSDKTags, AwsSQSTags, AwsSNSTags, SpanTags, AwsDynamoTags,
  SNSRequesTypes, SQSRequestTypes, AwsKinesisTags, AwsS3Tags, AwsLambdaTags,
  SpanTypes, DynamoDBRequestTypes, KinesisRequestTypes, ClassNames, DomainNames,
  DBTags, DBTypes, FirehoseRequestTypes, AwsFirehoseTags, AWS_SERVICE_REQUEST, S3RequestTypes, LambdaRequestType,
} from '../../Constants';
import Utils from '../Utils';
import { Span } from 'opentracing';
import { DB_INSTANCE, DB_STATEMENT, DB_USER, DB_TYPE } from 'opentracing/lib/ext/tags';

const shimmer = require('shimmer');
const Hook = require('require-in-the-middle');

class AWSIntegration implements Integration {
  version: string;
  lib: any;
  config: any;
  hook: any;
  basedir: string;

  constructor(tracer: ThundraTracer, config: any) {
    this.version = '2.x';
    this.hook = Hook('aws-sdk', { internals: true }, (exp: any, name: string, basedir: string) => {
      if (name === 'aws-sdk') {
        this.lib = exp;
        this.config = config;
        this.basedir = basedir;

        this.wrap.call(this, exp, tracer, config);
      }
      return exp;
    });
  }

  wrap(lib: any, tracer: ThundraTracer, config: any) {
    function wrapper(wrappedFunction: any) {
      return function AWSSDKWrapper(callback: any) {
        try {
          const request = this;
          const serviceEndpoint = request.service.config.endpoint;
          const serviceName = Utils.getServiceName(serviceEndpoint as string);
          const parentSpan = tracer.getActiveSpan();
          const originalCallback = callback;

          let activeSpan: Span = null;

          if (serviceName === 'sqs') {
            const operationName = request.operation;
            const operationType = SQSRequestTypes[operationName];
            const queueName = operationType ?
              Utils.getQueueName(request.params.QueueUrl) : AWS_SERVICE_REQUEST;

            activeSpan = tracer._startSpan(queueName, {
              childOf: parentSpan,
              domainName: DomainNames.MESSAGING,
              className: ClassNames.SQS,
              tags: {
                [SpanTags.SPAN_TYPE]: SpanTypes.AWS_SQS,
                [AwsSQSTags.QUEUE_NAME]: queueName,
                [SpanTags.OPERATION_TYPE]: operationType ? operationType : 'READ',
              },
            });
          } else if (serviceName === 'sns') {
            const operationName = request.operation;
            const operationType = SNSRequesTypes[operationName];
            const topicName = operationType ?
              Utils.getTopicName(request.params.QueueUrl) : AWS_SERVICE_REQUEST;

            activeSpan = tracer._startSpan(topicName, {
              childOf: parentSpan,
              domainName: DomainNames.MESSAGING,
              className: ClassNames.SNS,
              tags: {
                [SpanTags.SPAN_TYPE]: SpanTypes.AWS_SNS,
                [AwsSNSTags.TOPIC_NAME]: topicName,
                [SpanTags.OPERATION_TYPE]: operationType ? operationType : 'READ',
              },
            });
          } else if (serviceName === 'dynamodb') {
            const operationName = request.operation;
            const statementType = DynamoDBRequestTypes[operationName];
            const tableName = statementType ? Utils.getDynamoDBTableName(request) : AWS_SERVICE_REQUEST;

            activeSpan = tracer._startSpan(tableName, {
              childOf: parentSpan,
              domainName: DomainNames.DB,
              className: ClassNames.DYNAMODB,
              tags: {
                [DB_TYPE]: DBTypes.DYNAMODB,
                [DB_INSTANCE]: serviceEndpoint,
                [DBTags.DB_STATEMENT_TYPE]: statementType ? statementType : 'READ',
                [SpanTags.OPERATION_TYPE]: statementType ? statementType : 'READ',
                [SpanTags.SPAN_TYPE]: SpanTypes.AWS_DYNAMO,
                [AwsDynamoTags.TABLE_NAME]: tableName,
              },
            });
          } else if (serviceName === 's3') {
            const operationName = request.operation;
            const operationType = S3RequestTypes[operationName];
            const bucketName = operationType ? request.params.Bucket : AWS_SERVICE_REQUEST;

            activeSpan = tracer._startSpan(bucketName, {
              childOf: parentSpan,
              domainName: DomainNames.STORAGE,
              className: ClassNames.S3,
              tags: {
                [SpanTags.SPAN_TYPE]: SpanTypes.AWS_S3,
                [SpanTags.OPERATION_TYPE]: operationType ? operationType : 'READ',
                [AwsS3Tags.BUCKET_NAME]: request.params.Bucket,
                [AwsS3Tags.OBJECT_NAME]: request.params.Body,
              },
            });
          } else if (serviceName === 'lambda') {
            const operationName = request.operation;
            const operationType = LambdaRequestType[operationName];
            const lambdaName = operationType ? request.params.FunctionName : AWS_SERVICE_REQUEST;

            activeSpan = tracer._startSpan(lambdaName, {
              childOf: parentSpan,
              tags: {
                [SpanTags.SPAN_TYPE]: SpanTypes.AWS_LAMBDA,
                [SpanTags.OPERATION_TYPE]: operationType,
                [AwsLambdaTags.FUNCTION_NAME]: lambdaName,
                [AwsLambdaTags.FUNCTION_QUALIFIER]: request.params.Qualifier,
                [AwsLambdaTags.INVOCATION_PAYLOAD]: request.params.Payload,
                [AwsLambdaTags.INVOCATION_TYPE]: request.params.InvocationType,
              },
            });
          } else if (serviceName === 'kinesis') {
            const operationName = request.operation;
            const streamName = KinesisRequestTypes[operationName] ?
              request.params.StreamName : AWS_SERVICE_REQUEST;

            activeSpan = tracer._startSpan(streamName, {
              childOf: parentSpan,
              domainName: DomainNames.STREAM,
              className: ClassNames.KINESIS,
              tags: {
                [SpanTags.OPERATION_TYPE]: KinesisRequestTypes[operationName] ?
                  KinesisRequestTypes[operationName] : 'READ',
                [SpanTags.SPAN_TYPE]: SpanTypes.AWS_KINESIS,
                [AwsKinesisTags.STREAM_NAME]: streamName,
              },
            });
          } else if (serviceName === 'firehose') {
            const operationName = request.operation;
            const streamName = FirehoseRequestTypes[operationName] ?
              request.params.StreamName : AWS_SERVICE_REQUEST;

            activeSpan = tracer._startSpan(streamName, {
              childOf: parentSpan,
              domainName: DomainNames.STREAM,
              className: ClassNames.FIREHOSE,
              tags: {
                [SpanTags.OPERATION_TYPE]: FirehoseRequestTypes[operationName] ?
                  FirehoseRequestTypes[operationName] : 'READ',
                [SpanTags.SPAN_TYPE]: SpanTypes.AWS_KINESIS,
                [AwsFirehoseTags.STREAM_NAME]: streamName,
              },
            });
          } else {
            activeSpan = tracer._startSpan(AWS_SERVICE_REQUEST, {
              childOf: parentSpan,
              domainName: DomainNames.AWS,
              className: ClassNames.AWSSERVICE,
              tags: {
                [AwsSDKTags.SERVICE_NAME]: serviceName,
                [AwsSDKTags.REQUEST_NAME]: request.operation,
              },
            });
          }

          const wrappedCallback = (err: any, res: any) => {
            activeSpan.finish();
            if (err) {
              const parseError = Utils.parseError(err);
              activeSpan.setTag('error', true);
              activeSpan.setTag('error.kind', parseError.errorType);
              activeSpan.setTag('error.message', parseError.errorMessage);
              activeSpan.setTag('error.stack', parseError.stack);
              activeSpan.setTag('error.code', parseError.code);

            }
            originalCallback(err, res);
          };

          return wrappedFunction.apply(this, [wrappedCallback]);

        } catch (error) {
          console.error(error);
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
