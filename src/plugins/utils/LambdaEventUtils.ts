import ThundraSpan from '../../opentracing/Span';
import { SpanTags, DomainNames, ClassNames } from '../../Constants';
import ThundraLogger from '../../ThundraLogger';
import * as zlib from 'zlib';
import ThundraSpanContext from '../../opentracing/SpanContext';
import ThundraTracer from '../../opentracing/Tracer';
import * as opentracing from 'opentracing';
import InvocationSupport from '../support/InvocationSupport';
import AWSIntegration from '../integrations/AWSIntegration';
import InvocationTraceSupport from '../support/InvocationTraceSupport';

const get = require('lodash.get');

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
        } else if (originalEvent.requestContext && originalEvent.resource && originalEvent.path) {
            return LambdaEventType.APIGatewayProxy;
        } else if (originalEvent.context && originalEvent.context.stage && originalEvent.context['resource-path']) {
                return LambdaEventType.APIGatewayPassThrough;
        } else if (originalContext.clientContext) {
            return LambdaEventType.Lambda;
        }
    }

    static injectTriggerTagsForKinesis(span: ThundraSpan, originalEvent: any): String {
        const domainName = DomainNames.STREAM;
        const className = ClassNames.KINESIS;
        const traceLinks: any[] = [];
        const streamNames = new Set();
        for (const record of originalEvent.Records) {
            const region = record.awsRegion || '';
            const eventID = record.eventID || false;
            const evenSourceARN = record.eventSourceARN;
            const streamName = evenSourceARN.substring(evenSourceARN.indexOf('/') + 1);
            streamNames.add(streamName);

            if (eventID) {
                traceLinks.push(`${region}:${streamName}:${eventID}`);
            }
        }
        InvocationTraceSupport.addIncomingTraceLinks(traceLinks);
        this.injectTrigerTragsForInvocation(domainName, className, Array.from(streamNames));
        this.injectTrigerTragsForSpan(span, domainName, className, Array.from(streamNames));

        return className;
    }

    static injectTriggerTagsForFirehose(span: ThundraSpan, originalEvent: any): String {
        const domainName = DomainNames.STREAM;
        const className = ClassNames.FIREHOSE;
        const streamARN = originalEvent.deliveryStreamArn;
        const streamName = streamARN.substring(streamARN.indexOf('/') + 1);
        const region = originalEvent.region || '';
        const records  = originalEvent.records || [];
        const traceLinks: any[] = [];

        for (const record of records) {
            const arriveTime = record.approximateArrivalTimestamp;
            const data = record.data;
            if (arriveTime && data) {
                const timestamp = Math.floor(arriveTime / 1000) - 1;
                traceLinks.push(...AWSIntegration
                    .generateFirehoseTraceLinks(region, streamName,
                        timestamp, Buffer.from(data, 'base64')));
            }
        }
        InvocationTraceSupport.addIncomingTraceLinks(traceLinks);
        this.injectTrigerTragsForInvocation(domainName, className, [streamName]);
        this.injectTrigerTragsForSpan(span, domainName, className, [streamName]);

        return className;
    }

    static injectTriggerTagsForDynamoDB(span: ThundraSpan, originalEvent: any): String {
        const domainName = DomainNames.DB;
        const className = ClassNames.DYNAMODB;
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
                const spanId = get(record, 'dynamodb.NewImage.x-thundra-span-id', false);
                if (spanId) {
                    traceLinkFound = true;
                    traceLinks.push(`SAVE:${spanId}`);
                }
            } else if (record.eventName === 'REMOVE') {
                const spanId = get(record, 'dynamodb.OldImage.x-thundra-span-id', false);
                if (spanId) {
                    traceLinkFound = true;
                    traceLinks.push(`DELETE:${spanId}`);
                }
            }

            if (!traceLinkFound) {
                const creationTime = get(record, 'dynamodb.ApproximateCreationDateTime', false);
                if (creationTime) {
                    const NewImage = get(record, 'dynamodb.NewImage', {});
                    const Keys = get(record, 'dynamodb.Keys', {});
                    const timestamp = creationTime - 1;
                    if (record.eventName === 'INSERT' || record.eventName === 'MODIFY') {
                        traceLinks.push(...AWSIntegration.generateDynamoTraceLinks(
                            NewImage, 'SAVE', tableName, region, timestamp,
                        ));
                        traceLinks.push(...AWSIntegration.generateDynamoTraceLinks(
                            Keys, 'SAVE', tableName, region, timestamp,
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

        return className;
    }

    static injectTriggerTagsForSNS(span: ThundraSpan, originalEvent: any): String {
        const domainName = DomainNames.MESSAGING;
        const className = ClassNames.SNS;
        const traceLinks: any[] = [];
        const topicNames: Set<string> = new Set<string>();
        for (const record of originalEvent.Records) {
            const topicARN = record.Sns.TopicArn;
            const topicName = topicARN.substring(topicARN.lastIndexOf(':') + 1);
            const messageId = record.Sns.MessageId;
            topicNames.add(topicName);
            traceLinks.push(messageId);
        }
        InvocationTraceSupport.addIncomingTraceLinks(traceLinks);
        this.injectTrigerTragsForInvocation(domainName, className, Array.from(topicNames));
        this.injectTrigerTragsForSpan(span, domainName, className, Array.from(topicNames));

        return className;
    }

    static injectTriggerTagsForSQS(span: ThundraSpan, originalEvent: any): String {
        const domainName = DomainNames.MESSAGING;
        const className = ClassNames.SQS;
        const traceLinks: any[] = [];
        const queueNames: Set<string> = new Set<string>();
        for (const message of originalEvent.Records) {
            const queueARN = message.eventSourceARN;
            const queueName = queueARN.substring(queueARN.lastIndexOf(':') + 1);
            const messageId = message.messageId;
            queueNames.add(queueName);
            traceLinks.push(messageId);
        }
        InvocationTraceSupport.addIncomingTraceLinks(traceLinks);
        this.injectTrigerTragsForInvocation(domainName, className, Array.from(queueNames));
        this.injectTrigerTragsForSpan(span, domainName, className, Array.from(queueNames));

        return className;
    }

    static injectTriggerTagsForS3(span: ThundraSpan, originalEvent: any): String {
        const domainName = DomainNames.STORAGE;
        const className = ClassNames.S3;
        const traceLinks: any[] = [];
        const bucketNames: Set<string> = new Set<string>();
        for (const record of originalEvent.Records) {
            const bucketName = record.s3.bucket.name;
            const requestId = get(record, 'responseElements.x-amz-request-id', false);
            bucketNames.add(bucketName);

            if (requestId) {
                traceLinks.push(requestId);
            }
        }
        InvocationTraceSupport.addIncomingTraceLinks(traceLinks);
        this.injectTrigerTragsForInvocation(domainName, className, Array.from(bucketNames));
        this.injectTrigerTragsForSpan(span, domainName, className, Array.from(bucketNames));

        return className;
    }

    static injectTriggerTagsForCloudWatchSchedule(span: ThundraSpan, originalEvent: any): String {
        const domainName = DomainNames.SCHEDULE;
        const className = ClassNames.CLOUDWATCH;

        const scheduleNames: Set<string> = new Set<string>();
        for (const resource of originalEvent.resources) {
            const scheduleName = resource.substring(resource.indexOf('/') + 1);
            scheduleNames.add(scheduleName);
        }

        this.injectTrigerTragsForInvocation(domainName, className, Array.from(scheduleNames));
        this.injectTrigerTragsForSpan(span, domainName, className, Array.from(scheduleNames));

        return className;
    }

    static injectTriggerTagsForCloudWatchLogs(span: ThundraSpan, originalEvent: any): String {
        try {
            const buffer = Buffer.from(originalEvent.awslogs.data, 'base64');
            const logData = JSON.parse(zlib.gunzipSync(buffer).toString('utf-8'));
            const domainName = 'Log';
            const className = 'AWS-CloudWatch-Log';

            this.injectTrigerTragsForInvocation(domainName, className, [logData.logGroup]);
            this.injectTrigerTragsForSpan(span, domainName, className, [logData.logGroup]);

            return className;
        } catch (error) {
            ThundraLogger.getInstance().error('Cannot read CloudWatch log data. ' + error);
        }
    }

    static injectTriggerTagsForCloudFront(span: ThundraSpan, originalEvent: any): String {
        const domainName = DomainNames.CDN;
        const className = ClassNames.CLOUDFRONT;

        const uris: Set<string> = new Set<string>();
        for (const record of originalEvent.Records) {
            const uri = record.cf.request.uri;
            uris.add(uri);
        }

        this.injectTrigerTragsForInvocation(domainName, className, Array.from(uris));
        this.injectTrigerTragsForSpan(span, domainName, className, Array.from(uris));

        return className;
    }

    static injectTriggerTagsForAPIGatewayProxy(span: ThundraSpan, originalEvent: any): String {
        const domainName = DomainNames.API;
        const className = ClassNames.APIGATEWAY;
        const operationName = originalEvent.resource;
        const incomingSpanId = get(originalEvent, 'headers.x-thundra-span-id', false);

        if (incomingSpanId) {
            InvocationTraceSupport.addIncomingTraceLinks([incomingSpanId]);
        }
        this.injectTrigerTragsForInvocation(domainName, className, [operationName]);
        this.injectTrigerTragsForSpan(span, domainName, className, [operationName]);

        return className;
    }

    static injectTriggerTagsForAPIGatewayPassThrough(span: ThundraSpan, originalEvent: any): String {
        const domainName = DomainNames.API;
        const className = ClassNames.APIGATEWAY;
        const host = get(originalEvent, 'params.header.Host', '');
        const operationName = host + '/' + originalEvent.context.stage + originalEvent.context['resource-path'];

        this.injectTrigerTragsForInvocation(domainName, className, [operationName]);
        this.injectTrigerTragsForSpan(span, domainName, className, [operationName]);

        return className;
    }

    static injectTriggerTagsForLambda(span: ThundraSpan, originalContext: any): String {
        if (originalContext && originalContext.clientContext && originalContext.clientContext.custom &&
            originalContext.clientContext.custom[LambdaEventUtils.LAMBDA_TRIGGER_OPERATION_NAME]) {
            const domainName = DomainNames.API;
            const className = ClassNames.LAMBDA;
            const operationNames = [originalContext.clientContext.custom[LambdaEventUtils.LAMBDA_TRIGGER_OPERATION_NAME]];
            const requestId = originalContext.awsRequestId;

            InvocationTraceSupport.addIncomingTraceLinks([requestId]);
            this.injectTrigerTragsForInvocation(domainName, className, operationNames);
            this.injectTrigerTragsForSpan(span, domainName, className, operationNames);

            return className;
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
        InvocationSupport.setAgentTag(SpanTags.TRIGGER_DOMAIN_NAME, domainName);
        InvocationSupport.setAgentTag(SpanTags.TRIGGER_CLASS_NAME, className);
        InvocationSupport.setAgentTag(SpanTags.TRIGGER_OPERATION_NAMES, operationNames);
    }

    static injectTrigerTragsForSpan(span: ThundraSpan, domainName: string, className: string, operationNames: any[]) {
        span.setTag(SpanTags.TRIGGER_DOMAIN_NAME, domainName);
        span.setTag(SpanTags.TRIGGER_CLASS_NAME, className);
        span.setTag(SpanTags.TRIGGER_OPERATION_NAMES, operationNames);
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
