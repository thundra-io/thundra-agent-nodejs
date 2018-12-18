import ThundraSpan from '../../opentracing/Span';
import { SpanTags } from '../../Constants';
import ThundraLogger from '../../ThundraLogger';
import * as zlib from 'zlib';
import ThundraSpanContext from '../../opentracing/SpanContext';
import ThundraTracer from '../../opentracing/Tracer';
import * as opentracing from 'opentracing';

class LambdaEventUtils {
    static LAMBDA_TRIGGER_OPERATION_NAME = 'x-thundra-lambda-trigger-operation-name';

    static getLambdaEventType(originalEvent: any, originalContext: any): LambdaEventType {
        if (originalEvent.Records && Array.isArray(originalEvent.Records) &&
            originalEvent.Records[0] && originalEvent.Records[0].kinesis) {
            return LambdaEventType.Kinesis;
       } else if (originalEvent.deliveryStreamArn && Array.isArray(originalEvent.records)) {
            return LambdaEventType.FireHose;
       } else if (originalEvent.Records && Array.isArray(originalEvent.Records) &&
            originalEvent.Records[0] && originalEvent.Records[0].dynamodb) {
            return LambdaEventType.DynamoDB;
       } else if (originalEvent.Records && Array.isArray(originalEvent.Records) &&
            originalEvent.Records[0] && originalEvent.Records[0].EventSource === 'aws:sns') {
            return LambdaEventType.SNS;
       } else if (originalEvent.Records && Array.isArray(originalEvent.Records) &&
            originalEvent.Records[0] && originalEvent.Records[0].eventSource === 'aws:sqs') {
            return LambdaEventType.SQS;
        } else if (originalEvent.Records && Array.isArray(originalEvent.Records) &&
            originalEvent.Records[0] && originalEvent.Records[0].s3) {
            return LambdaEventType.S3;
        } else if (originalEvent['detail-type'] && originalEvent['detail-type'] === 'Scheduled Event'
            && Array.isArray(originalEvent.resources)) {
            return LambdaEventType.CloudWatchSchedule;
        } else if (originalEvent.awslogs && originalEvent.awslogs.data) {
            return LambdaEventType.CloudWatchLog;
        } else if (originalEvent.Records && Array.isArray(originalEvent.Records) &&
            originalEvent.Records[0] && originalEvent.Records[0].cf) {
            return LambdaEventType.CloudFront;
        } else if (originalEvent.requestContext && originalEvent.headers) {
            return LambdaEventType.APIGatewayProxy;
        } else if (originalContext.clientContext) {
            return LambdaEventType.Lambda;
        }
    }

    static injectTriggerTagsForKinesis(span: ThundraSpan, originalEvent: any): void {
        span.setTag(SpanTags.TRIGGER_DOMAIN_NAME, 'Stream');
        span.setTag(SpanTags.TRIGGER_CLASS_NAME, 'AWS-Kinesis');
        span.setTag(SpanTags.TOPOLOGY_VERTEX, true);
        const streamNames = new Set();
        for (const record of originalEvent.Records) {
            const evenSourceARN = record.eventSourceARN;
            const streamName = evenSourceARN.substring(evenSourceARN.indexOf('/') + 1);
            streamNames.add(streamName);
        }
        span.setTag(SpanTags.TRIGGER_OPERATION_NAMES, Array.from(streamNames));
    }

    static injectTriggerTagsForFirehose(span: ThundraSpan, originalEvent: any): void {
        span.setTag(SpanTags.TRIGGER_DOMAIN_NAME, 'Stream');
        span.setTag(SpanTags.TRIGGER_CLASS_NAME, 'AWS-Firehose');
        span.setTag(SpanTags.TOPOLOGY_VERTEX, true);
        const streamARN = originalEvent.deliveryStreamArn;
        const streamName = streamARN.substring(streamARN.indexOf('/') + 1);
        span.setTag(SpanTags.TRIGGER_OPERATION_NAMES, [streamName]);
    }

    static injectTriggerTagsForDynamoDB(span: ThundraSpan, originalEvent: any): void {
        span.setTag(SpanTags.TRIGGER_DOMAIN_NAME, 'DB');
        span.setTag(SpanTags.TRIGGER_CLASS_NAME, 'AWS-DynamoDB');
        span.setTag(SpanTags.TOPOLOGY_VERTEX, true);
        const tableNames: Set<string> = new Set<string>();
        for (const record of originalEvent.Records) {
            const evenSourceARN = record.eventSourceARN;
            const idx1 = evenSourceARN.indexOf('/');
            const idx2 = evenSourceARN.indexOf('/', idx1 + 1);
            const tableName = evenSourceARN.substring(idx1 + 1, idx2);
            tableNames.add(tableName);
        }
        span.setTag(SpanTags.TRIGGER_OPERATION_NAMES, Array.from(tableNames));
    }

    static injectTriggerTagsForSNS(span: ThundraSpan, originalEvent: any): void {
        span.setTag(SpanTags.TRIGGER_DOMAIN_NAME, 'Messaging');
        span.setTag(SpanTags.TRIGGER_CLASS_NAME, 'AWS-SNS');
        span.setTag(SpanTags.TOPOLOGY_VERTEX, true);
        const topicNames: Set<string> = new Set<string>();
        for (const record of originalEvent.Records) {
            const topicARN = record.Sns.TopicArn;
            const topicName = topicARN.substring(topicARN.lastIndexOf(':') + 1);
            topicNames.add(topicName);
        }
        span.setTag(SpanTags.TRIGGER_OPERATION_NAMES, Array.from(topicNames));
    }

    static injectTriggerTagsForSQS(span: ThundraSpan, originalEvent: any) {
        span.setTag(SpanTags.TRIGGER_DOMAIN_NAME, 'Messaging');
        span.setTag(SpanTags.TRIGGER_CLASS_NAME, 'AWS-SQS');
        span.setTag(SpanTags.TOPOLOGY_VERTEX, true);
        const queueNames: Set<string> = new Set<string>();
        for (const message of originalEvent.Records) {
            const queueARN = message.eventSourceARN;
            const queueName = queueARN.substring(queueARN.lastIndexOf(':') + 1);
            queueNames.add(queueName);
        }
        span.setTag(SpanTags.TRIGGER_OPERATION_NAMES, Array.from(queueNames));
    }

    static injectTriggerTagsForS3(span: ThundraSpan, originalEvent: any) {
        span.setTag(SpanTags.TRIGGER_DOMAIN_NAME, 'Storage');
        span.setTag(SpanTags.TRIGGER_CLASS_NAME, 'AWS-S3');
        span.setTag(SpanTags.TOPOLOGY_VERTEX, true);
        const bucketNames: Set<string> = new Set<string>();
        for (const record of originalEvent.Records) {
            const bucketName = record.s3.bucket.name;
            bucketNames.add(bucketName);
        }
        span.setTag(SpanTags.TRIGGER_OPERATION_NAMES, Array.from(bucketNames));
    }

    static injectTriggerTagsForCloudWatchSchedule(span: ThundraSpan, originalEvent: any) {
        span.setTag(SpanTags.TRIGGER_DOMAIN_NAME, 'Schedule');
        span.setTag(SpanTags.TRIGGER_CLASS_NAME, 'AWS-CloudWatch-Schedule');
        span.setTag(SpanTags.TOPOLOGY_VERTEX, true);
        const scheduleNames: Set<string> = new Set<string>();
        for (const resource of originalEvent.resources) {
            const scheduleName = resource.substring(resource.indexOf('/') + 1);
            scheduleNames.add(scheduleName);
        }
        span.setTag(SpanTags.TRIGGER_OPERATION_NAMES, Array.from(scheduleNames));
    }

    static injectTriggerTagsForCloudWatchLogs(span: ThundraSpan, originalEvent: any) {
        try {
            const buffer = Buffer.from(originalEvent.awslogs.data, 'base64');
            const logData = JSON.parse(zlib.gunzipSync(buffer).toString('utf-8'));
            span.setTag(SpanTags.TRIGGER_DOMAIN_NAME, 'Log');
            span.setTag(SpanTags.TRIGGER_CLASS_NAME, 'AWS-CloudWatch-Log');
            span.setTag(SpanTags.TRIGGER_OPERATION_NAMES, [logData.logGroup]);
            span.setTag(SpanTags.TOPOLOGY_VERTEX, true);
        } catch (error) {
            ThundraLogger.getInstance().error('Cannot read CloudWatch log data. ' + error);
        }
    }

    static injectTriggerTagsForCloudFront(span: ThundraSpan, originalEvent: any) {
        span.setTag(SpanTags.TRIGGER_DOMAIN_NAME, 'CDN');
        span.setTag(SpanTags.TRIGGER_CLASS_NAME, 'AWS-CloudFront');
        span.setTag(SpanTags.TOPOLOGY_VERTEX, true);
        const uris: Set<string> = new Set<string>();
        for (const record of originalEvent.Records) {
            const uri = record.cf.request.uri;
            uris.add(uri);
        }
        span.setTag(SpanTags.TRIGGER_OPERATION_NAMES, Array.from(uris));
    }

    static injectTriggerTagsForAPIGatewayProxy(span: ThundraSpan, originalEvent: any) {
        span.setTag(SpanTags.TRIGGER_DOMAIN_NAME, 'API');
        span.setTag(SpanTags.TRIGGER_CLASS_NAME, 'AWS-APIGateway');
        span.setTag(SpanTags.TRIGGER_OPERATION_NAMES, [originalEvent.path]);
        span.setTag(SpanTags.TOPOLOGY_VERTEX, true);
    }

    static injectTriggerTagsForLambda(span: ThundraSpan, originalContext: any) {
        if (originalContext && originalContext.clientContext && originalContext.clientContext.custom &&
            originalContext.clientContext.custom[LambdaEventUtils.LAMBDA_TRIGGER_OPERATION_NAME]) {
            span.setTag(SpanTags.TRIGGER_DOMAIN_NAME, 'API');
            span.setTag(SpanTags.TRIGGER_CLASS_NAME, 'AWS-Lambda');
            span.setTag(SpanTags.TRIGGER_OPERATION_NAMES,
                [originalContext.clientContext.custom[LambdaEventUtils.LAMBDA_TRIGGER_OPERATION_NAME]]);
            span.setTag(SpanTags.TOPOLOGY_VERTEX, true);
        }
    }

    static extractSpanContextFromSNSEvent(tracer: ThundraTracer, originalEvent: any): ThundraSpanContext {
        let spanContext: ThundraSpanContext;

        for (const record of originalEvent.Records) {
            const carrier: any = {};
            const messageAttributes = record.Sns.MessageAttributes;

            for (const key of Object.keys(messageAttributes)) {
                const messageAttribute = messageAttributes[key];
                if (messageAttribute.Type === 'String') {
                    carrier[key] = messageAttribute.Value;
                }
            }

            const sc: ThundraSpanContext = tracer.extract(opentracing.FORMAT_TEXT_MAP, carrier) as ThundraSpanContext;
            if (sc) {
                if (!spanContext) {
                    spanContext = sc;
                } else {
                    if (spanContext.traceId !== sc.traceId &&
                        spanContext.transactionId !== sc.transactionId &&
                        spanContext.spanId !== sc.spanId) {
                        // TODO Currently we don't support batch of SNS messages from different traces/transactions/spans
                        return;
                    }
                }
            } else {
                return;
            }
        }
        return spanContext;
    }

    static extractSpanContextFromSQSEvent(tracer: ThundraTracer, originalEvent: any): ThundraSpanContext {
        let spanContext: ThundraSpanContext;
        for (const record of originalEvent.Records) {
            const carrier: any = {};
            const messageAttributes = record.messageAttributes;

            for (const key of Object.keys(messageAttributes)) {
                const messageAttribute = messageAttributes[key];
                if (messageAttribute.dataType === 'String') {
                    carrier[key] = messageAttribute.stringValue;
                }
            }

            const sc: ThundraSpanContext = tracer.extract(opentracing.FORMAT_TEXT_MAP, carrier) as ThundraSpanContext;
            if (sc) {
                if (!spanContext) {
                    spanContext = sc;
                } else {
                    if (spanContext.traceId !== sc.traceId &&
                        spanContext.transactionId !== sc.transactionId &&
                        spanContext.spanId !== sc.spanId) {
                        // TODO Currently we don't support batch of SNS messages from different traces/transactions/spans
                        return;
                    }
                }
            } else {
                return;
            }
        }
        return spanContext;
    }

}

export default  LambdaEventUtils;

export enum LambdaEventType {
    Kinesis,
    FireHose,
    DynamoDB,
    SNS,
    SQS,
    S3,
    CloudWatchSchedule,
    CloudWatchLog,
    CloudFront,
    APIGatewayProxy,
    Lambda,
}
