import ThundraSpan from '../../opentracing/Span';
import { SpanTags, DomainNames, ClassNames, ZeitTags,
    ZeitConstants, NetlifyConstants, EnvVariableKeys, THUNDRA_TRACE_KEY } from '../../Constants';
import ThundraLogger from '../../ThundraLogger';
import * as zlib from 'zlib';
import ThundraSpanContext from '../../opentracing/SpanContext';
import ThundraTracer from '../../opentracing/Tracer';
import * as opentracing from 'opentracing';
import InvocationSupport from '../../plugins/support/InvocationSupport';
import { AWSFirehoseIntegration, AWSDynamoDBIntegration } from '../../integrations/AWSIntegration';
import InvocationTraceSupport from '../../plugins/support/InvocationTraceSupport';
import Utils from '../../utils/Utils';

const get = require('lodash.get');

/**
 * Utility class for AWS Lambda event related stuff.
 */
class LambdaEventUtils {

    private static readonly LAMBDA_TRIGGER_OPERATION_NAME = 'x-thundra-lambda-trigger-operation-name';

    private constructor() {
    }
    /**
     * Checks if a propagated trace link exists in the incoming event
     * @param originalEvent the original AWS Lambda invocation event
     */
    static extractTraceLinkFromEvent(originalEvent: any) {
        try {
            const incomingTraceLink = get(originalEvent, `${THUNDRA_TRACE_KEY}.trace_link`);
            if (incomingTraceLink) {
                InvocationTraceSupport.addIncomingTraceLink(incomingTraceLink);
            }
        } catch (e) { /* pass */ }
    }

    /**
     * Gets the {@link LambdaEventType} of the given event
     * @param originalEvent the original AWS Lambda invocation event
     * @param originalContext the original AWS Lambda invocation context
     * @return {LambdaEventType} the detected event type
     */
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
        } else if (process.env[NetlifyConstants.NETLIFY_UNIQUE_ENV] || process.env[NetlifyConstants.NETLIFY_DEV]) {
            return LambdaEventType.Netlify;
        } else if (originalContext.clientContext) {
            return LambdaEventType.Lambda;
        } else if (originalEvent['detail-type'] && originalEvent.detail && originalEvent.version
            && Array.isArray(originalEvent.resources)) {
            return LambdaEventType.EventBridge;
        } else if (originalEvent.Action && originalEvent.body) {
            try {
                const { headers } = JSON.parse(originalEvent.body);
                if (headers && headers[ZeitConstants.DEPLOYMENT_URL_HEADER]) {
                    return LambdaEventType.Zeit;
                }
            } catch (err) {
                // Event is not a Zeit event, pass
            }
        }
    }

    /**
     * Injects trigger tags for AWS Kinesis events
     * @param {ThundraSpan} span the span to inject tags
     * @param originalEvent the original AWS Lambda invocation event
     * @return {string} the class name of the trigger
     */
    static injectTriggerTagsForKinesis(span: ThundraSpan, originalEvent: any): string {
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
        this.injectTriggerTagsForInvocation(domainName, className, Array.from(streamNames));
        this.injectTriggerTagsForSpan(span, domainName, className, Array.from(streamNames));

        return className;
    }

    /**
     * Injects trigger tags for AWS Firehose events
     * @param {ThundraSpan} span the span to inject tags
     * @param originalEvent the original AWS Lambda invocation event
     * @return {string} the class name of the trigger
     */
    static injectTriggerTagsForFirehose(span: ThundraSpan, originalEvent: any): string {
        const domainName = DomainNames.STREAM;
        const className = ClassNames.FIREHOSE;
        const streamARN = originalEvent.deliveryStreamArn;
        const streamName = streamARN.substring(streamARN.indexOf('/') + 1);
        const region = originalEvent.region || '';
        const records = originalEvent.records || [];
        const traceLinks: any[] = [];

        for (const record of records) {
            const arriveTime = record.approximateArrivalTimestamp;
            const data = record.data;
            if (arriveTime && data) {
                const timestamp = Math.floor(arriveTime / 1000) - 1;
                traceLinks.push(...AWSFirehoseIntegration
                    .generateFirehoseTraceLinks(region, streamName,
                        timestamp, Buffer.from(data, 'base64')));
            }
        }
        InvocationTraceSupport.addIncomingTraceLinks(traceLinks);
        this.injectTriggerTagsForInvocation(domainName, className, [streamName]);
        this.injectTriggerTagsForSpan(span, domainName, className, [streamName]);

        return className;
    }

    /**
     * Injects trigger tags for AWS DynamoDB events
     * @param {ThundraSpan} span the span to inject tags
     * @param originalEvent the original AWS Lambda invocation event
     * @return {string} the class name of the trigger
     */
    static injectTriggerTagsForDynamoDB(span: ThundraSpan, originalEvent: any): string {
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
                        traceLinks.push(...AWSDynamoDBIntegration.generateDynamoTraceLinks(
                            NewImage, 'SAVE', tableName, region, timestamp,
                        ));
                        traceLinks.push(...AWSDynamoDBIntegration.generateDynamoTraceLinks(
                            Keys, 'SAVE', tableName, region, timestamp,
                        ));
                    } else if (record.eventName === 'REMOVE') {
                        traceLinks.push(...AWSDynamoDBIntegration.generateDynamoTraceLinks(
                            Keys, 'DELETE', tableName, region, timestamp,
                        ));
                    }
                }
            }
        }
        InvocationTraceSupport.addIncomingTraceLinks(traceLinks);
        this.injectTriggerTagsForInvocation(domainName, className, Array.from(tableNames));
        this.injectTriggerTagsForSpan(span, domainName, className, Array.from(tableNames));

        return className;
    }

    /**
     * Injects trigger tags for AWS SNS events
     * @param {ThundraSpan} span the span to inject tags
     * @param originalEvent the original AWS Lambda invocation event
     * @return {string} the class name of the trigger
     */
    static injectTriggerTagsForSNS(span: ThundraSpan, originalEvent: any): string {
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
        this.injectTriggerTagsForInvocation(domainName, className, Array.from(topicNames));
        this.injectTriggerTagsForSpan(span, domainName, className, Array.from(topicNames));

        return className;
    }

    /**
     * Injects trigger tags for AWS SQS events
     * @param {ThundraSpan} span the span to inject tags
     * @param originalEvent the original AWS Lambda invocation event
     * @return {string} the class name of the trigger
     */
    static injectTriggerTagsForSQS(span: ThundraSpan, originalEvent: any): string {
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
        this.injectTriggerTagsForInvocation(domainName, className, Array.from(queueNames));
        this.injectTriggerTagsForSpan(span, domainName, className, Array.from(queueNames));

        return className;
    }

    /**
     * Injects trigger tags for AWS S3 events
     * @param {ThundraSpan} span the span to inject tags
     * @param originalEvent the original AWS Lambda invocation event
     * @return {string} the class name of the trigger
     */
    static injectTriggerTagsForS3(span: ThundraSpan, originalEvent: any): string {
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
        this.injectTriggerTagsForInvocation(domainName, className, Array.from(bucketNames));
        this.injectTriggerTagsForSpan(span, domainName, className, Array.from(bucketNames));

        return className;
    }

    /**
     * Injects trigger tags for AWS EventBridge events
     * @param {ThundraSpan} span the span to inject tags
     * @param originalEvent the original AWS Lambda invocation event
     * @return {string} the class name of the trigger
     */
    static injectTriggerTagsForEventBridge(span: ThundraSpan, originalEvent: any): string {
        const domainName = DomainNames.MESSAGING;
        const className = ClassNames.EVENTBRIDGE;
        const traceLinks: any[] = [];
        const eventDetails: Set<string> = new Set<string>();

        traceLinks.push(originalEvent.id);
        eventDetails.add(originalEvent['detail-type']);

        InvocationTraceSupport.addIncomingTraceLinks(traceLinks);
        this.injectTriggerTagsForInvocation(domainName, className, Array.from(eventDetails));
        this.injectTriggerTagsForSpan(span, domainName, className, Array.from(eventDetails));

        return className;
    }

    /**
     * Injects trigger tags for AWS CloudFront Schedule events
     * @param {ThundraSpan} span the span to inject tags
     * @param originalEvent the original AWS Lambda invocation event
     * @return {string} the class name of the trigger
     */
    static injectTriggerTagsForCloudWatchSchedule(span: ThundraSpan, originalEvent: any): string {
        const domainName = DomainNames.SCHEDULE;
        const className = ClassNames.CLOUDWATCH;

        const scheduleNames: Set<string> = new Set<string>();
        for (const resource of originalEvent.resources) {
            const scheduleName = resource.substring(resource.indexOf('/') + 1);
            scheduleNames.add(scheduleName);
        }

        this.injectTriggerTagsForInvocation(domainName, className, Array.from(scheduleNames));
        this.injectTriggerTagsForSpan(span, domainName, className, Array.from(scheduleNames));

        return className;
    }

    /**
     * Injects trigger tags for AWS CloudWatch Log events
     * @param {ThundraSpan} span the span to inject tags
     * @param originalEvent the original AWS Lambda invocation event
     * @return {string} the class name of the trigger
     */
    static injectTriggerTagsForCloudWatchLogs(span: ThundraSpan, originalEvent: any): string {
        try {
            const buffer = Buffer.from(originalEvent.awslogs.data, 'base64');
            const logData = JSON.parse(zlib.gunzipSync(buffer).toString('utf-8'));
            const domainName = 'Log';
            const className = 'AWS-CloudWatch-Log';

            this.injectTriggerTagsForInvocation(domainName, className, [logData.logGroup]);
            this.injectTriggerTagsForSpan(span, domainName, className, [logData.logGroup]);

            return className;
        } catch (error) {
            ThundraLogger.error('Cannot read CloudWatch log data. ' + error);
        }
    }

    /**
     * Injects trigger tags for AWS CloudFront events
     * @param {ThundraSpan} span the span to inject tags
     * @param originalEvent the original AWS Lambda invocation event
     * @return {string} the class name of the trigger
     */
    static injectTriggerTagsForCloudFront(span: ThundraSpan, originalEvent: any): string {
        const domainName = DomainNames.CDN;
        const className = ClassNames.CLOUDFRONT;

        const uris: Set<string> = new Set<string>();
        for (const record of originalEvent.Records) {
            const uri = record.cf.request.uri;
            uris.add(uri);
        }

        this.injectTriggerTagsForInvocation(domainName, className, Array.from(uris));
        this.injectTriggerTagsForSpan(span, domainName, className, Array.from(uris));

        return className;
    }

    /**
     * Injects trigger tags for AWS API Gateway (Proxy mode) events
     * @param {ThundraSpan} span the span to inject tags
     * @param originalEvent the original AWS Lambda invocation event
     * @return {string} the class name of the trigger
     */
    static injectTriggerTagsForAPIGatewayProxy(span: ThundraSpan, originalEvent: any): string {
        const domainName = DomainNames.API;
        const className = ClassNames.APIGATEWAY;
        const operationName = originalEvent.resource;
        const incomingSpanId = get(originalEvent, 'headers.x-thundra-span-id', false);

        if (incomingSpanId) {
            InvocationTraceSupport.addIncomingTraceLinks([incomingSpanId]);
        }
        this.injectTriggerTagsForInvocation(domainName, className, [operationName]);
        this.injectTriggerTagsForSpan(span, domainName, className, [operationName]);

        return className;
    }

    /**
     * Injects trigger tags for AWS API Gateway (Pass Through mode) events
     * @param {ThundraSpan} span the span to inject tags
     * @param originalEvent the original AWS Lambda invocation event
     * @return {string} the class name of the trigger
     */
    static injectTriggerTagsForAPIGatewayPassThrough(span: ThundraSpan, originalEvent: any): string {
        const domainName = DomainNames.API;
        const className = ClassNames.APIGATEWAY;
        const host = get(originalEvent, 'params.header.Host', '');
        const operationName = host + '/' + originalEvent.context.stage + originalEvent.context['resource-path'];

        this.injectTriggerTagsForInvocation(domainName, className, [operationName]);
        this.injectTriggerTagsForSpan(span, domainName, className, [operationName]);

        return className;
    }

    /**
     * Injects trigger tags for AWS Lambda events
     * @param {ThundraSpan} span the span to inject tags
     * @param originalContext the original AWS Lambda invocation context
     * @return {string} the class name of the trigger
     */
    static injectTriggerTagsForLambda(span: ThundraSpan, originalContext: any): string {
        if (originalContext && originalContext.awsRequestId) {
            InvocationTraceSupport.addIncomingTraceLinks([originalContext.awsRequestId]);
        }
        if (originalContext && originalContext.clientContext && originalContext.clientContext.custom &&
            originalContext.clientContext.custom[LambdaEventUtils.LAMBDA_TRIGGER_OPERATION_NAME]) {
            const domainName = DomainNames.API;
            const className = ClassNames.LAMBDA;
            const operationNames = [originalContext.clientContext.custom[LambdaEventUtils.LAMBDA_TRIGGER_OPERATION_NAME]];

            this.injectTriggerTagsForInvocation(domainName, className, operationNames);
            this.injectTriggerTagsForSpan(span, domainName, className, operationNames);

            return className;
        }
    }

    /**
     * Injects trigger tags for Zeit events
     * @param {ThundraSpan} span the span to inject tags
     * @param originalEvent the original AWS Lambda invocation event
     * @return {string} the class name of the trigger
     */
    static injectTriggerTagsForZeit(span: ThundraSpan, originalEvent: any): string {
        const className = ClassNames.ZEIT;
        const domainName = DomainNames.API;
        let operationName = 'zeit-now';

        try {
            const { headers, host } = JSON.parse(originalEvent.body);

            if (headers[ZeitConstants.DEPLOYMENT_URL_HEADER]) {
                const deplomentUrl = headers[ZeitConstants.DEPLOYMENT_URL_HEADER];
                InvocationSupport.setTag(ZeitTags.DEPLOYMENT_URL, deplomentUrl);
            }

            if (host) {
                operationName = host;
            }
        } catch (err) {
            // Event is not a Zeit event, pass
        }

        this.injectTriggerTagsForInvocation(domainName, className, [operationName]);
        this.injectTriggerTagsForSpan(span, domainName, className, [operationName]);

        return className;
    }

    /**
     * Injects trigger tags for Netlify events
     * @param {ThundraSpan} span the span to inject tags
     * @param originalEvent the original AWS Lambda invocation event
     * @return {string} the class name of the trigger
     */
    static injectTriggerTagsForNetlify(span: ThundraSpan, originalEvent: any): string {
        const className = ClassNames.NETLIFY;
        const domainName = DomainNames.API;

        const siteName = Utils.getEnvVar(NetlifyConstants.NETLIFY_SITE_NAME, 'netlify_site');
        const originalHandler = Utils.getEnvVar(EnvVariableKeys._HANDLER, 'netlify_function.handler');

        const functionName = siteName + '/' + originalHandler.substring(0, originalHandler.indexOf('.'));

        span._setOperationName(functionName);

        this.injectTriggerTagsForInvocation(domainName, className, [siteName]);
        this.injectTriggerTagsForSpan(span, domainName, className, [siteName]);

        return className;
    }

    /**
     * Injects trigger tags for common events
     * @param {ThundraSpan} span the span to inject tags
     * @param originalEvent the original AWS Lambda invocation event
     * @param originalContext the original AWS Lambda invocation context
     */
    static injectTriggerTagsForCommon(span: ThundraSpan, originalEvent: any, originalContext: any): string {
        if (originalContext && originalContext.awsRequestId) {
            InvocationTraceSupport.addIncomingTraceLinks([originalContext.awsRequestId]);
        }
        return null;
    }

    /**
     * Extracts span context from given SNS event
     * @param {ThundraTracer} tracer the tracer
     * @param originalEvent the original AWS Lambda invocation event
     * @return {ThundraSpanContext} the extracted {@link ThundraSpanContext}
     */
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

    /**
     * Extracts span context from given SQS event
     * @param {ThundraTracer} tracer the tracer
     * @param originalEvent the original AWS Lambda invocation event
     * @return {ThundraSpanContext} the extracted {@link ThundraSpanContext}
     */
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

    /**
     * Injects triggers tags to the current AWS Lambda invocation
     * @param {string} domainName the trigger domain name
     * @param {string} className the trigger class name
     * @param {string} operationNames the trigger operation names
     */
    static injectTriggerTagsForInvocation(domainName: string, className: string, operationNames: any[]) {
        InvocationSupport.setAgentTag(SpanTags.TRIGGER_DOMAIN_NAME, domainName);
        InvocationSupport.setAgentTag(SpanTags.TRIGGER_CLASS_NAME, className);
        InvocationSupport.setAgentTag(SpanTags.TRIGGER_OPERATION_NAMES, operationNames);
    }

    /**
     * Injects triggers tags into the given span
     * @param {ThundraSpan} span the span to inject trigger tags
     * @param {string} domainName the trigger domain name
     * @param {string} className the trigger class name
     * @param {string} operationNames the trigger operation names
     */
    static injectTriggerTagsForSpan(span: ThundraSpan, domainName: string, className: string, operationNames: any[]) {
        span.setTag(SpanTags.TRIGGER_DOMAIN_NAME, domainName);
        span.setTag(SpanTags.TRIGGER_CLASS_NAME, className);
        span.setTag(SpanTags.TRIGGER_OPERATION_NAMES, operationNames);
    }

}

export default LambdaEventUtils;

/**
 * Supported AWS Lambda event types
 */
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
    EventBridge,
    Zeit,
    Netlify,
    SES,
}
