import Integration from './Integration';
import ThundraTracer from '../../opentracing/Tracer';
import {
  AwsClassNames, AwsSDKTags, AwsSQSTags, AwsSNSTags, SpanTags, AwsDynamoTags,
  SNSCommandTypes, SQSCommandTypes, AwsKinesisTags, AwsS3Tags, AwsLambdaTags,
  SpanTypes, DynamoDBRequestTypes, KinesisRequestTypes,
} from '../../Constants';
import Utils from '../Utils';
import { Span } from 'opentracing';

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

            activeSpan = tracer.startSpan(AwsClassNames.AwsSQS, {
              childOf: parentSpan,
              tags: {
                [SpanTags.SPAN_TYPE]: SpanTypes.AWS_SQS,
                [AwsSQSTags.QUEUE_NAME]: Utils.getQueueName(request.params.QueueUrl),
                [SpanTags.OPERATION_TYPE]: SQSCommandTypes[operationName],
                [AwsSDKTags.HOST]: request.service.config.endpoint,
              },
            });
          }

          if (serviceName === 'sns') {
            const operationName = request.operation;

            activeSpan = tracer.startSpan(AwsClassNames.AwsSNS, {
              childOf: parentSpan,
              tags: {
                [SpanTags.SPAN_TYPE]: SpanTypes.AWS_SNS,
                [AwsSNSTags.TOPIC_NAME]: Utils.getTopicName(request.params.TopicArn),
                [SpanTags.OPERATION_TYPE]: SNSCommandTypes[operationName],
                [AwsSDKTags.HOST]: request.service.config.endpoint,
              },
            });
          }

          if (serviceName === 'dynamodb') {
            const operationName = request.operation;

            activeSpan = tracer.startSpan(AwsClassNames.AwsDDB, {
              childOf: parentSpan,
              tags: {
                [SpanTags.OPERATION_TYPE]: DynamoDBRequestTypes[operationName] ?
                                           DynamoDBRequestTypes[operationName] : 'READ',
                [SpanTags.SPAN_TYPE]: SpanTypes.AWS_DYNAMO,
                [AwsDynamoTags.TABLE_NAME]: Utils.getDynamoDBTableName(request),
              },
            });
          }

          if (serviceName === 's3') {
            const operationName = request.operation;

            activeSpan = tracer.startSpan(AwsClassNames.AwsS3, {
              childOf: parentSpan,
              tags: {
                [SpanTags.SPAN_TYPE]: SpanTypes.AWS_S3,
                [SpanTags.OPERATION_TYPE]: DynamoDBRequestTypes[operationName] ?
                                           DynamoDBRequestTypes[operationName] : 'READ',
                [AwsS3Tags.BUCKET_NAME]: request.params.Bucket,
                [AwsS3Tags.OBJECT_NAME]: request.params.Body,
              },
            });
          }

          if (serviceName === 'lambda') {
             activeSpan = tracer.startSpan(AwsClassNames.AwsLambda, {
              childOf: parentSpan,
              tags: {
                [SpanTags.SPAN_TYPE]: SpanTypes.AWS_LAMBDA,
                [AwsLambdaTags.FUNCTION_NAME]: request.params.FunctionName,
                [AwsLambdaTags.FUNCTION_QUALIFIER]: request.params.Qualifier,
                [AwsLambdaTags.INVOCATION_PAYLOAD]: request.params.Payload,
                [AwsLambdaTags.INVOCATION_TYPE]: request.params.InvocationType,
              },
            });
          }

          if (serviceName === 'kinesis') {
            const operationName = request.operation;

            activeSpan = tracer.startSpan(AwsClassNames.AwsKinesis, {
              childOf: parentSpan,
              tags: {
                [SpanTags.OPERATION_TYPE]: KinesisRequestTypes[operationName] ?
                                           KinesisRequestTypes[operationName] : 'READ',
                [SpanTags.SPAN_TYPE]: SpanTypes.AWS_KINESIS,
                [AwsKinesisTags.STREAM_NAME]: request.params.StreamName,
              },
            });
          }

          const wrappedCallback = (err: any, res: any) => {
            activeSpan.finish();
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
