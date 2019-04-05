import ThundraSpan from '../../opentracing/Span';
import { SpanTags } from '../../Constants';
import ThundraLogger from '../../ThundraLogger';
import * as zlib from 'zlib';
import ThundraSpanContext from '../../opentracing/SpanContext';
import ThundraTracer from '../../opentracing/Tracer';
import * as opentracing from 'opentracing';
import InvocationSupport from '../support/InvocationSupport';
import AWSIntegration from '../integrations/AWSIntegration';
import InvocationTraceSupport from '../support/InvocationTraceSupport';

const _ = require('lodash');

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
        } else if (originalEvent.context && originalEvent['stage-variables'] &&
            originalEvent.params && originalEvent['body-json']) {
                return LambdaEventType.APIGatewayPassThrough;
        } else if (originalContext.clientContext) {
            return LambdaEventType.Lambda;
        }
    }

    static injectTriggerTagsForKinesis(span: ThundraSpan, originalEvent: any): void {
        const domainName = 'Stream';
        const className = 'AWS-Kinesis';

        const streamNames = new Set();
        for (const record of originalEvent.Records) {
            const evenSourceARN = record.eventSourceARN;
            const streamName = evenSourceARN.substring(evenSourceARN.indexOf('/') + 1);
            streamNames.add(streamName);
        }

        this.injectTrigerTragsForInvocation(domainName, className, Array.from(streamNames));
        this.injectTrigerTragsForSpan(span, domainName, className, Array.from(streamNames));
    }

    static injectTriggerTagsForFirehose(span: ThundraSpan, originalEvent: any): void {
        const domainName = 'Stream';
        const className = 'AWS-Firehose';
        const streamARN = originalEvent.deliveryStreamArn;
        const streamName = streamARN.substring(streamARN.indexOf('/') + 1);

        this.injectTrigerTragsForInvocation(domainName, className, [streamName]);
        this.injectTrigerTragsForSpan(span, domainName, className, [streamName]);
    }

    static injectTriggerTagsForDynamoDB(span: ThundraSpan, originalEvent: any): void {
        const domainName = 'DB';
        const className = 'AWS-DynamoDB';
        const traceLinks: any[] = [];
        const tableNames: Set<string> = new Set<string>();
        for (const record of originalEvent.Records) {
            const evenSourceARN = record.eventSourceARN;
            const idx1 = evenSourceARN.indexOf('/');
            const idx2 = evenSourceARN.indexOf('/', idx1 + 1);
            const tableName = evenSourceARN.substring(idx1 + 1, idx2);
            const region = record.awsRegion || '';
            tableNames.add(tableName);

            // Find trace links
            let traceLinkFound: boolean = false;
            if (record.eventName === 'INSERT' || record.eventName === 'MODIFY') {
                const spanId = _.get(record, 'dynamodb.NewImage.x-thundra-span-id', false);
                if (spanId) {
                    traceLinkFound = true;
                    traceLinks.push(`SAVE:${spanId}`);
                }
            } else if (record.eventName === 'REMOVE') {
                const spanId = _.get(record, 'dynamodb.OldImage.x-thundra-span-id', false);
                if (spanId) {
                    traceLinkFound = true;
                    traceLinks.push(`DELETE:${spanId}`);
                }
            }

            if (!traceLinkFound) {
                const creationTime = _.get(record, 'dynamodb.ApproximateCreationDateTime', false);
                if (creationTime) {
                    const NewImage = _.get(record, 'dynamodb.NewImage', {});
                    const Keys = _.get(record, 'dynamodb.Keys', {});
                    const timestamp = creationTime - 1;
                    if (record.eventName === 'INSERT') {
                        traceLinks.push(...AWSIntegration.generateDynamoTraceLinks(
                            NewImage, 'PUT', tableName, region, timestamp,
                        ));
                    } else if (record.eventName === 'MODIFY') {
                        traceLinks.push(...AWSIntegration.generateDynamoTraceLinks(
                            NewImage, 'PUT', tableName, region, timestamp,
                        ));
                        traceLinks.push(...AWSIntegration.generateDynamoTraceLinks(
                            Keys, 'UPDATE', tableName, region, timestamp,
                        ));
                    } else if (record.eventName === 'REMOVE') {
                        traceLinks.push(...AWSIntegration.generateDynamoTraceLinks(
                            Keys, 'DELETE', tableName, region, timestamp,
                        ));
                    }
                }
            }
        }
        InvocationTraceSupport.addIncomingTraceLinks(traceLinks);
        this.injectTrigerTragsForInvocation(domainName, className, Array.from(tableNames));
        this.injectTrigerTragsForSpan(span, domainName, className, Array.from(tableNames));
    }

    static injectTriggerTagsForSNS(span: ThundraSpan, originalEvent: any): void {
        const domainName = 'Messaging';
        const className = 'AWS-SNS';

        const topicNames: Set<string> = new Set<string>();
        for (const record of originalEvent.Records) {
            const topicARN = record.Sns.TopicArn;
            const topicName = topicARN.substring(topicARN.lastIndexOf(':') + 1);
            topicNames.add(topicName);
        }

        this.injectTrigerTragsForInvocation(domainName, className, Array.from(topicNames));
        this.injectTrigerTragsForSpan(span, domainName, className, Array.from(topicNames));
    }

    static injectTriggerTagsForSQS(span: ThundraSpan, originalEvent: any) {
        const domainName = 'Messaging';
        const className = 'AWS-SQS';
        const traceLinks: any[] = [];
        const queueNames: Set<string> = new Set<string>();
        for (const message of originalEvent.Records) {
            const queueARN = message.eventSourceARN;
            const queueName = queueARN.substring(queueARN.lastIndexOf(':') + 1);
            const messageId = message.messageId || '';
            queueNames.add(queueName);
            traceLinks.push(messageId);
        }
        InvocationTraceSupport.addIncomingTraceLinks(traceLinks);
        this.injectTrigerTragsForInvocation(domainName, className, Array.from(queueNames));
        this.injectTrigerTragsForSpan(span, domainName, className, Array.from(queueNames));
    }

    static injectTriggerTagsForS3(span: ThundraSpan, originalEvent: any) {
        const domainName = 'Storage';
        const className = 'AWS-S3';

        const bucketNames: Set<string> = new Set<string>();
        for (const record of originalEvent.Records) {
            const bucketName = record.s3.bucket.name;
            bucketNames.add(bucketName);
        }

        this.injectTrigerTragsForInvocation(domainName, className, Array.from(bucketNames));
        this.injectTrigerTragsForSpan(span, domainName, className, Array.from(bucketNames));
    }

    static injectTriggerTagsForCloudWatchSchedule(span: ThundraSpan, originalEvent: any) {
        const domainName = 'Schedule';
        const className = 'AWS-CloudWatch-Schedule';

        const scheduleNames: Set<string> = new Set<string>();
        for (const resource of originalEvent.resources) {
            const scheduleName = resource.substring(resource.indexOf('/') + 1);
            scheduleNames.add(scheduleName);
        }

        this.injectTrigerTragsForInvocation(domainName, className, Array.from(scheduleNames));
        this.injectTrigerTragsForSpan(span, domainName, className, Array.from(scheduleNames));
    }

    static injectTriggerTagsForCloudWatchLogs(span: ThundraSpan, originalEvent: any) {
        try {
            const buffer = Buffer.from(originalEvent.awslogs.data, 'base64');
            const logData = JSON.parse(zlib.gunzipSync(buffer).toString('utf-8'));
            const domainName = 'Log';
            const className = 'AWS-CloudWatch-Log';

            this.injectTrigerTragsForInvocation(domainName, className, [logData.logGroup]);
            this.injectTrigerTragsForSpan(span, domainName, className, [logData.logGroup]);
        } catch (error) {
            ThundraLogger.getInstance().error('Cannot read CloudWatch log data. ' + error);
        }
    }

    static injectTriggerTagsForCloudFront(span: ThundraSpan, originalEvent: any) {
        const domainName = 'CDN';
        const className = 'AWS-CloudFront';

        const uris: Set<string> = new Set<string>();
        for (const record of originalEvent.Records) {
            const uri = record.cf.request.uri;
            uris.add(uri);
        }

        this.injectTrigerTragsForInvocation(domainName, className, Array.from(uris));
        this.injectTrigerTragsForSpan(span, domainName, className, Array.from(uris));
    }

    static injectTriggerTagsForAPIGatewayProxy(span: ThundraSpan, originalEvent: any) {
        const domainName = 'API';
        const className = 'AWS-APIGateway';
        const operationName = originalEvent.headers.Host + '/' + originalEvent.requestContext.stage + originalEvent.path;

        this.injectTrigerTragsForInvocation(domainName, className, [operationName]);
        this.injectTrigerTragsForSpan(span, domainName, className, [operationName]);
    }

    static injectTriggerTagsForAPIGatewayPassThrough(span: ThundraSpan, originalEvent: any) {
        const domainName = 'API';
        const className = 'AWS-APIGateway';
        const operationName = originalEvent.params.header.Host + '/' + originalEvent.context.stage +
                             originalEvent.context['resource-path'];

        this.injectTrigerTragsForInvocation(domainName, className, [operationName]);
        this.injectTrigerTragsForSpan(span, domainName, className, [operationName]);
    }

    static injectTriggerTagsForLambda(span: ThundraSpan, originalContext: any) {
        if (originalContext && originalContext.clientContext && originalContext.clientContext.custom &&
            originalContext.clientContext.custom[LambdaEventUtils.LAMBDA_TRIGGER_OPERATION_NAME]) {
            const domainName = 'API';
            const className = 'AWS-Lambda';
            const operationNames = [originalContext.clientContext.custom[LambdaEventUtils.LAMBDA_TRIGGER_OPERATION_NAME]];

            this.injectTrigerTragsForInvocation(domainName, className, operationNames);
            this.injectTrigerTragsForSpan(span, domainName, className, operationNames);
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

    static injectTrigerTragsForInvocation(domainName: string, className: string, operationNames: any[]) {
        InvocationSupport.setTag(SpanTags.TRIGGER_DOMAIN_NAME, domainName);
        InvocationSupport.setTag(SpanTags.TRIGGER_CLASS_NAME, className);
        InvocationSupport.setTag(SpanTags.TRIGGER_OPERATION_NAMES, operationNames);
    }

    static injectTrigerTragsForSpan(span: ThundraSpan, domainName: string, className: string, operationNames: any[]) {
        span.setTag(SpanTags.TRIGGER_DOMAIN_NAME, domainName);
        span.setTag(SpanTags.TRIGGER_CLASS_NAME, className);
        span.setTag(SpanTags.TRIGGER_OPERATION_NAMES, operationNames);
        span.setTag(SpanTags.TOPOLOGY_VERTEX, true);
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
    APIGatewayPassThrough,
    Lambda,
}
