import ThundraTracer from '../opentracing/Tracer';
import {
    AwsSDKTags, AwsSQSTags, AwsSNSTags, SpanTags, AwsDynamoTags,
    AwsKinesisTags, AwsS3Tags, AwsLambdaTags,
    AwsStepFunctionsTags, SpanTypes, ClassNames, DomainNames,
    DBTags, DBTypes, AwsFirehoseTags, AWS_SERVICE_REQUEST,
    AwsAthenaTags, AwsEventBridgeTags, AwsSESTags, THUNDRA_TRACE_KEY,
} from '../Constants';
import Utils from '../utils/Utils';
import LambdaUtils from '../utils/LambdaUtils';
import { DB_INSTANCE, DB_TYPE } from 'opentracing/lib/ext/tags';
import ThundraLogger from '../ThundraLogger';
import ThundraSpan from '../opentracing/Span';
import * as opentracing from 'opentracing';
import AWSOperationTypesConfig from './AWSOperationTypes';
import ConfigProvider from '../config/ConfigProvider';
import ConfigNames from '../config/ConfigNames';

const md5 = require('md5');
const has = require('lodash.has');
const trim = require('lodash.trim');
const get = require('lodash.get');

export class AWSServiceIntegration {

    private static AWSOperationTypes: any = undefined;

    public static injectSpanContextIntoMessageAttributes(tracer: ThundraTracer, span: ThundraSpan): any {
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

    public static serviceFactory(serviceName: string): any {
        switch (serviceName) {
            case 'sqs':
                return AWSSQSIntegration;
            case 'sns':
                return AWSSNSIntegration;
            case 'dynamodb':
                return AWSDynamoDBIntegration;
            case 's3':
                return AWSS3Integration;
            case 'lambda':
                return AWSLambdaIntegration;
            case 'kinesis':
                return AWSKinesisIntegration;
            case 'firehose':
                return AWSFirehoseIntegration;
            case 'athena':
                return AWSAthenaIntegration;
            case 'eventbridge':
                return AWSEventBridgeIntegration;
            case 'ses':
                return AWSSESIntegration;
            case 'stepfunctions':
                return AWSStepFunctionsIntegration;
            default:
                return AWSServiceIntegration;
        }
    }

    public static getServiceFromReq(request: any): any {
        const serviceName = AWSServiceIntegration.getServiceName(request);

        return AWSServiceIntegration.serviceFactory(serviceName);
    }

    public static getOperationType(operationName: string, className: string): string {
        const awsOpTypes = AWSServiceIntegration.AWSOperationTypes;
        if (!awsOpTypes) {
            return '';
        }

        const { exclusions, patterns } = awsOpTypes;

        operationName = Utils.capitalize(operationName);
        if (has(exclusions, `${className}.${operationName}`)) {
            return get(exclusions, `${className}.${operationName}`);
        }

        for (const pattern of patterns) {
            if (pattern.expression.test(operationName)) {
                return pattern.operationType;
            }
        }

        return '';
    }

    public static getServiceName(request: any): string {
        return get(request, 'service.constructor.prototype.serviceIdentifier', '');
    }

    public static getServiceRegion(request: any): string {
        return get(request, 'service.config.region', '');
    }

    public static getServiceEndpoint(request: any): string {
        return get(request, 'service.config.endpoint', '');
    }

    public static hasInRequestParams(request: any, paramFieldName: string): boolean {
        if (!request.params) {
            return false;
        }
        return has(request.params, paramFieldName);
    }

    public static getFromRequestParams(request: any, paramFieldName: string, defaultValue: any = null): any {
        if (!request.params) {
            return defaultValue;
        }
        return get(request.params, paramFieldName, defaultValue);
    }

    public static hasInResponseData(response: any, dataFieldName: string): boolean {
        if (!response.data) {
            return false;
        }
        return has(response.data, dataFieldName);
    }

    public static getFromResponseData(response: any, dataFieldName: string, defaultValue: any = null): any {
        if (!response.data) {
            return defaultValue;
        }
        return get(response.data, dataFieldName, defaultValue);
    }

    public static hasInHttpResponse(response: any, httpResponseFieldName: string): boolean {
        if (!response.httpResponse) {
            return false;
        }
        return has(response.httpResponse, httpResponseFieldName);
    }

    public static getFromHttpResponse(response: any, httpResponseFieldName: string, defaultValue: any = null): any {
        if (!response.httpResponse) {
            return defaultValue;
        }
        return get(response.httpResponse, httpResponseFieldName, defaultValue);
    }

    public static hasRequestIdInResponse(response: any): boolean {
        return AWSServiceIntegration.hasInHttpResponse(response, 'headers.x-amz-request-id') ||
            AWSServiceIntegration.hasInHttpResponse(response, 'headers.x-amzn-requestid');
    }

    public static getRequestIdFromResponse(response: any): string {
        return AWSServiceIntegration.getFromHttpResponse(response, 'headers.x-amz-request-id') ||
            AWSServiceIntegration.getFromHttpResponse(response, 'headers.x-amzn-requestid');
    }

    public static hasDateInResponse(response: any): boolean {
        return AWSServiceIntegration.hasInHttpResponse(response, 'headers.date');
    }

    public static getDateFromResponse(response: any): string {
        return AWSServiceIntegration.getFromHttpResponse(response, 'headers.date');
    }

    public static parseAWSOperationTypes() {
        if (AWSServiceIntegration.AWSOperationTypes) {
            return;
        }

        AWSServiceIntegration.AWSOperationTypes = {
            exclusions: AWSOperationTypesConfig.exclusions,
            patterns: [],
        };

        for (const pattern in AWSOperationTypesConfig.patterns) {
            const operationType = AWSOperationTypesConfig.patterns[pattern];
            AWSServiceIntegration.AWSOperationTypes.patterns.push({
                expression: new RegExp(pattern, 'i'),
                operationType,
            });
        }
    }

    public static injectTraceLink(span: ThundraSpan, req: any, res: any, config: any): void {
        try {
            if (span.getTag(SpanTags.TRACE_LINKS) || !req) {
                return;
            }

            const service = AWSServiceIntegration.getServiceFromReq(req);
            const traceLinks = service.createTraceLinks(span, req, res, config);

            if (traceLinks.length > 0) {
                span.setTag(SpanTags.TRACE_LINKS, traceLinks);
            }
        } catch (error) {
            ThundraLogger.error(`Error while injecting trace links, ${error}`);
        }
    }

    public static doCreateSpan(tracer: any, request: any, config: any): ThundraSpan {
        const service = AWSServiceIntegration.getServiceFromReq(request);

        return service.createSpan(tracer, request, config);
    }

    public static doProcessResponse(span: ThundraSpan, request: any, response: any, config: any): void {
        const service = AWSServiceIntegration.getServiceFromReq(request);

        service.processResponse(span, request, response, config);
    }

    public static createSpan(tracer: any, request: any, config: any): ThundraSpan {
        const operationName = request.operation ? request.operation : AWS_SERVICE_REQUEST;
        const operationType = AWSServiceIntegration.getOperationType(operationName, ClassNames.AWSSERVICE);
        const serviceName = AWSServiceIntegration.getServiceName(request);

        const parentSpan = tracer.getActiveSpan();
        const activeSpan = tracer._startSpan(AWS_SERVICE_REQUEST, {
            childOf: parentSpan,
            domainName: DomainNames.AWS,
            className: ClassNames.AWSSERVICE,
            disableActiveStart: true,
            tags: {
                [SpanTags.OPERATION_TYPE]: operationType,
                [AwsSDKTags.SERVICE_NAME]: serviceName,
                [AwsSDKTags.REQUEST_NAME]: operationName,
            },
        });

        return activeSpan;
    }

    public static createTraceLinks(span: ThundraSpan, request: any, response: any, config: any): any[] {
        return [];
    }

    public static processResponse(span: ThundraSpan, request: any, response: any, config: any): void {
        return;
    }

}

export class AWSAthenaIntegration {

    public static createSpan(tracer: any, request: any, config: any): ThundraSpan {
        const operationName = request.operation ? request.operation : AWS_SERVICE_REQUEST;
        const dbName: string = request.params.Database ||
            AWSServiceIntegration.getFromRequestParams(request, 'QueryExecutionContext.Database', '');
        const outputLocation: string =
            AWSServiceIntegration.getFromRequestParams(request, 'ResultConfiguration.OutputLocation', '');
        const operationType = AWSServiceIntegration.getOperationType(operationName, ClassNames.ATHENA);
        const spanName: string = dbName ? dbName : AWS_SERVICE_REQUEST;
        const parentSpan = tracer.getActiveSpan();

        const activeSpan = tracer._startSpan(spanName, {
            childOf: parentSpan,
            domainName: DomainNames.DB,
            className: ClassNames.ATHENA,
            disableActiveStart: true,
            tags: {
                [SpanTags.OPERATION_TYPE]: operationType,
                [SpanTags.SPAN_TYPE]: SpanTypes.AWS_ATHENA,
                [AwsSDKTags.REQUEST_NAME]: operationName,
            },
        });

        let queryExecIds: string[] = [];
        let namedQueryIds: string[] = [];

        if (request.params.QueryExecutionIds) {
            queryExecIds = request.params.QueryExecutionIds;
        } else if (request.params.QueryExecutionId) {
            queryExecIds = [request.params.QueryExecutionId];
        }

        if (request.params.NamedQueryIds) {
            namedQueryIds = request.params.NamedQueryIds;
        } else if (request.params.NamedQueryId) {
            namedQueryIds = [request.params.NamedQueryId];
        }

        if (operationType) {
            activeSpan.setTag(SpanTags.TOPOLOGY_VERTEX, true);

            if (outputLocation !== '') {
                activeSpan.setTag(AwsAthenaTags.S3_OUTPUT_LOCATION, outputLocation);
            }
            if (dbName !== '') {
                activeSpan.setTag(DBTags.DB_INSTANCE, dbName);
            }
            if (!config.maskAthenaStatement) {
                if (request.params.QueryString) {
                    activeSpan.setTag(DBTags.DB_STATEMENT, request.params.QueryString);
                }
            }
            if (queryExecIds.length > 0) {
                activeSpan.setTag(AwsAthenaTags.REQUEST_QUERY_EXECUTION_IDS, queryExecIds);
            }
            if (namedQueryIds.length > 0) {
                activeSpan.setTag(AwsAthenaTags.REQUEST_NAMED_QUERY_IDS, namedQueryIds);
            }
        }

        return activeSpan;
    }

    public static createTraceLinks(span: ThundraSpan, request: any, response: any, config: any): any[] {
        return [];
    }

    public static processResponse(span: ThundraSpan, request: any, response: any, config: any): void {
        if (AWSServiceIntegration.hasInResponseData(response, 'QueryExecutionIds')) {
            span.setTag(
                AwsAthenaTags.RESPONSE_QUERY_EXECUTION_IDS,
                AWSServiceIntegration.getFromResponseData(response, 'QueryExecutionIds')
            );
        }
        if (AWSServiceIntegration.hasInResponseData(response, 'QueryExecutionId')) {
            span.setTag(
                AwsAthenaTags.REQUEST_QUERY_EXECUTION_IDS,
                [
                    AWSServiceIntegration.getFromResponseData(response, 'QueryExecutionId')
                ]);
        }
        if (AWSServiceIntegration.hasInResponseData(response, 'NamedQueryIds')) {
            span.setTag(
                AwsAthenaTags.RESPONSE_NAMED_QUERY_IDS,
                AWSServiceIntegration.getFromResponseData(response, 'NamedQueryIds')
            );
        }
        if (AWSServiceIntegration.hasInResponseData(response, 'NamedQueryId')) {
            span.setTag(
                AwsAthenaTags.RESPONSE_NAMED_QUERY_IDS,
                [
                    AWSServiceIntegration.getFromResponseData(response, 'NamedQueryId')
                ]
            );
        }
    }

}

export class AWSLambdaIntegration {

    public static createSpan(tracer: any, request: any, config: any): ThundraSpan {
        const operationName = request.operation ? request.operation : AWS_SERVICE_REQUEST;
        const operationType = AWSServiceIntegration.getOperationType(operationName, ClassNames.LAMBDA);
        const normalizedFunctionName = LambdaUtils.getNormalizedFunctionName(request);
        const spanName = normalizedFunctionName.name;
        const parentSpan = tracer.getActiveSpan();

        const activeSpan = tracer._startSpan(spanName, {
            childOf: parentSpan,
            domainName: DomainNames.API,
            className: ClassNames.LAMBDA,
            disableActiveStart: true,
            tags: {
                [SpanTags.SPAN_TYPE]: SpanTypes.AWS_LAMBDA,
                [AwsSDKTags.REQUEST_NAME]: operationName,
                [SpanTags.OPERATION_TYPE]: operationType,
                [AwsLambdaTags.FUNCTION_QUALIFIER]: request.params.Qualifier || normalizedFunctionName.qualifier,
                [AwsLambdaTags.INVOCATION_PAYLOAD]: config.maskLambdaPayload
                    ? undefined
                    : AWSLambdaIntegration.getPayload(request),
                [AwsLambdaTags.FUNCTION_NAME]: normalizedFunctionName.name,
                [AwsLambdaTags.INVOCATION_TYPE]: request.params.InvocationType,
            },
        });

        const custom = !config.lambdaTraceInjectionDisabled
            ? AWSLambdaIntegration.injectSpanContextIntoLambdaClientContext(tracer, activeSpan)
            : null;

        if (operationType) {
            activeSpan.setTag(SpanTags.TOPOLOGY_VERTEX, true);
        }

        // only "invoke" supports ClientContext", not "invokeAsync"
        if (custom && operationName && operationName === 'invoke') {
            if (request.params.ClientContext) {
                const context = Buffer.from(request.params.ClientContext, 'base64').toString('utf8');
                try {
                    const clientContext = JSON.parse(context);
                    clientContext.custom = custom;
                    request.params.ClientContext = Buffer.from(
                        JSON.stringify({ custom: clientContext })).toString('base64');
                } catch (err) {
                    ThundraLogger.error('Cannot parse lambda client context not a valid JSON');
                }
            } else {
                request.params.ClientContext = Buffer.from(JSON.stringify({ custom })).toString('base64');
            }
        }

        return activeSpan;
    }

    public static createTraceLinks(span: ThundraSpan, request: any, response: any, config: any): any[] {
        const requestId = AWSServiceIntegration.getRequestIdFromResponse(response);

        let traceLinks: any[] = [];

        if (requestId) {
            traceLinks = [requestId];
        }

        return traceLinks;
    }

    public static processResponse(span: ThundraSpan, request: any, response: any, config: any): void {
        return;
    }

    private static getPayload(request: any): string {
        const payload = request.params.Payload || request.params.InvokeArgs;
        if (payload) {
            return payload.toString();
        } else {
            return null;
        }
    }

    private static injectSpanContextIntoLambdaClientContext(tracer: ThundraTracer, span: ThundraSpan): any {
        const custom: any = {};
        tracer.inject(span.spanContext, opentracing.FORMAT_TEXT_MAP, custom);
        return custom;
    }

}

export class AWSSNSIntegration {

    public static createSpan(tracer: any, request: any, config: any): ThundraSpan {
        const operationName = request.operation ? request.operation : AWS_SERVICE_REQUEST;
        const operationType = AWSServiceIntegration.getOperationType(operationName, ClassNames.SNS);

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
        spanName = spanName || AWS_SERVICE_REQUEST;

        const parentSpan = tracer.getActiveSpan();
        const activeSpan = tracer._startSpan(spanName, {
            childOf: parentSpan,
            domainName: DomainNames.MESSAGING,
            className: ClassNames.SNS,
            disableActiveStart: true,
            tags: {
                [SpanTags.SPAN_TYPE]: SpanTypes.AWS_SNS,
                [AwsSDKTags.REQUEST_NAME]: operationName,
                [SpanTags.OPERATION_TYPE]: operationType,
            },
        });

        if (operationType) {
            activeSpan.setTag(SpanTags.TOPOLOGY_VERTEX, true);

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
            const messageAttributes = !config.snsTraceInjectionDisabled
                ? AWSServiceIntegration.injectSpanContextIntoMessageAttributes(tracer, activeSpan)
                : null;
            if (messageAttributes) {
                const requestMessageAttributes = request.params.MessageAttributes ?
                    request.params.MessageAttributes : {};
                request.params.MessageAttributes = { ...requestMessageAttributes, ...messageAttributes };
            }
        }

        return activeSpan;
    }

    public static createTraceLinks(span: ThundraSpan, request: any, response: any, config: any): any[] {
        const messageId = AWSServiceIntegration.getFromResponseData(response, 'MessageId', false);

        let traceLinks: any[] = [];

        if (messageId) {
            traceLinks = [messageId];
        }

        return traceLinks;
    }

    public static processResponse(span: ThundraSpan, request: any, response: any, config: any): void {
        return;
    }

}

export class AWSStepFunctionsIntegration {
    public static createSpan(tracer: any, request: any, config: any): ThundraSpan {
        const operationName = request.operation ? request.operation : AWS_SERVICE_REQUEST;
        const operationType = AWSServiceIntegration.getOperationType(operationName, ClassNames.STEPFUNCTIONS);

        const spanName = AWSStepFunctionsIntegration.getStateMachineName(request) || AWS_SERVICE_REQUEST;
        const parentSpan = tracer.getActiveSpan();
        const activeSpan = tracer._startSpan(spanName, {
            childOf: parentSpan,
            domainName: DomainNames.AWS,
            className: ClassNames.STEPFUNCTIONS,
            disableActiveStart: true,
            tags: {
                [SpanTags.OPERATION_TYPE]: operationType,
                [SpanTags.SPAN_TYPE]: SpanTypes.AWS_STEPFUNCTIONS,
                [AwsSDKTags.REQUEST_NAME]: operationName,
            },
        });

        AWSStepFunctionsIntegration.createStepFunctionTraceLink(request, activeSpan);

        const stateMachineARN = request.params.stateMachineArn || '';
        const executionName = request.params.name || '';

        activeSpan.setTag(SpanTags.TOPOLOGY_VERTEX, true);
        activeSpan.setTag(AwsStepFunctionsTags.STATE_MACHINE_ARN, stateMachineARN);
        activeSpan.setTag(AwsStepFunctionsTags.EXECUTION_NAME, executionName);

        return activeSpan;
    }

    public static createTraceLinks(span: ThundraSpan, request: any, response: any, config: any): any[] {
        return [];
    }

    public static processResponse(span: ThundraSpan, request: any, response: any, config: any): void {
        const executionARN = AWSServiceIntegration.getFromResponseData(response, 'executionArn', '');
        const startDate = AWSServiceIntegration.getFromResponseData(response, 'startDate');

        span.setTag(AwsStepFunctionsTags.EXECUTION_ARN, executionARN);

        if (startDate) {
            span.setTag(AwsStepFunctionsTags.EXECUTION_START_DATE, startDate);
        }
    }

    private static getStateMachineName(request: any): string {
        const stateMachineARN = request.params.stateMachineArn;
        if (!stateMachineARN) {
            return undefined;
        }
        const stateMachineARNParts = stateMachineARN.split(':');
        return stateMachineARNParts[stateMachineARNParts.length - 1];
    }

    private static createStepFunctionTraceLink(request: any, span: ThundraSpan): void {
        try {
            const originalInput = request.params.input;
            if (originalInput) {
                span.setTag(AwsStepFunctionsTags.EXECUTION_INPUT, originalInput);

                const parsedInput = JSON.parse(originalInput);
                const traceLink = Utils.generateId();

                parsedInput[THUNDRA_TRACE_KEY] = { trace_link: traceLink, step: 0 };

                request.params.input = JSON.stringify(parsedInput);

                span.setTag(SpanTags.TRACE_LINKS, [traceLink]);
                span.resourceTraceLinks = [traceLink];
            }
        } catch (error) {/* pass */ }
    }
}

export class AWSSQSIntegration {

    public static createSpan(tracer: any, request: any, config: any): ThundraSpan {
        const operationName = request.operation ? request.operation : AWS_SERVICE_REQUEST;
        const operationType = AWSServiceIntegration.getOperationType(operationName, ClassNames.SQS);
        let queueName = AWSSQSIntegration.getQueueName(request.params.QueueUrl);
        queueName = queueName ? queueName.substring(queueName.lastIndexOf('/') + 1) : queueName;

        const parentSpan = tracer.getActiveSpan();
        const spanName = queueName || AWS_SERVICE_REQUEST;
        const activeSpan = tracer._startSpan(spanName, {
            childOf: parentSpan,
            domainName: DomainNames.MESSAGING,
            className: ClassNames.SQS,
            disableActiveStart: true,
            tags: {
                [SpanTags.SPAN_TYPE]: SpanTypes.AWS_SQS,
                [AwsSDKTags.REQUEST_NAME]: operationName,
                [SpanTags.OPERATION_TYPE]: operationType,
            },
        });

        if (operationType) {
            activeSpan.setTag(SpanTags.TOPOLOGY_VERTEX, true);
            activeSpan.setTag(AwsSQSTags.QUEUE_NAME, queueName);
        }

        const messageAttributes = !config.sqsTraceInjectionDisabled
            ? AWSServiceIntegration.injectSpanContextIntoMessageAttributes(tracer, activeSpan)
            : null;
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

        return activeSpan;
    }

    public static createTraceLinks(span: ThundraSpan, request: any, response: any, config: any): any[] {
        const operationName = request.operation;

        let traceLinks: any[] = [];

        if (operationName === 'sendMessage') {
            const messageId = AWSServiceIntegration.getFromResponseData(response, 'MessageId', '');
            traceLinks = [messageId];
        } else if (operationName === 'sendMessageBatch') {
            const entries = AWSServiceIntegration.getFromResponseData(response, 'Successful', []);
            entries.map((entry: any) => traceLinks.push(entry.MessageId));
        }

        return traceLinks;
    }

    public static processResponse(span: ThundraSpan, request: any, response: any, config: any): void {
        return;
    }

    private static getQueueName(url: any): string {
        return url ? url.split('/').pop() : null;
    }

}

export class AWSFirehoseIntegration {

    public static createSpan(tracer: any, request: any, config: any): ThundraSpan {
        const operationName = request.operation ? request.operation : AWS_SERVICE_REQUEST;
        const operationType = AWSServiceIntegration.getOperationType(operationName, ClassNames.FIREHOSE);

        const spanName = request.params.DeliveryStreamName || AWS_SERVICE_REQUEST;
        const parentSpan = tracer.getActiveSpan();
        const activeSpan = tracer._startSpan(spanName, {
            childOf: parentSpan,
            domainName: DomainNames.STREAM,
            className: ClassNames.FIREHOSE,
            disableActiveStart: true,
            tags: {
                [SpanTags.OPERATION_TYPE]: operationType,
                [SpanTags.SPAN_TYPE]: SpanTypes.AWS_FIREHOSE,
                [AwsSDKTags.REQUEST_NAME]: operationName,
            },
        });

        if (request.params.DeliveryStreamName) {
            activeSpan.setTag(SpanTags.TOPOLOGY_VERTEX, true);
            activeSpan.setTag(AwsFirehoseTags.STREAM_NAME, request.params.DeliveryStreamName);
        }

        return activeSpan;
    }

    public static createTraceLinks(span: ThundraSpan, request: any, response: any, config: any): any[] {
        const operationName = request.operation;
        const region = AWSServiceIntegration.getServiceRegion(request);
        const params = Object.assign({}, request.params);

        const deliveryStreamName = params.DeliveryStreamName || '';

        let traceLinks: any[] = [];
        let timestamp: number;

        if (AWSServiceIntegration.hasDateInResponse(response)) {
            timestamp = Date.parse(AWSServiceIntegration.getDateFromResponse(response)) / 1000;
        } else {
            timestamp = Math.floor(Date.now() / 1000) - 1;
        }

        if (operationName === 'putRecord') {
            const data = get(params, 'Record.Data', false);
            if (data) {
                traceLinks = AWSFirehoseIntegration.generateFirehoseTraceLinks(region, deliveryStreamName, timestamp, data);
            }
        } else if (operationName === 'putRecordBatch') {
            const records = params.Records || [];
            for (const record of records) {
                const data = record.Data;
                if (data) {
                    traceLinks.push(...AWSFirehoseIntegration.
                        generateFirehoseTraceLinks(region, deliveryStreamName, timestamp, data));
                }
            }
        }

        return traceLinks;
    }

    public static processResponse(span: ThundraSpan, request: any, response: any, config: any): void {
        return;
    }

    public static generateFirehoseTraceLinks(region: string, deliveryStreamName: string, timestamp: number, data: any) {
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

}

export class AWSKinesisIntegration {

    public static createSpan(tracer: any, request: any, config: any): ThundraSpan {
        const operationName = request.operation ? request.operation : AWS_SERVICE_REQUEST;
        const operationType = AWSServiceIntegration.getOperationType(operationName, ClassNames.KINESIS);
        const spanName = request.params.StreamName || AWS_SERVICE_REQUEST;

        const parentSpan = tracer.getActiveSpan();
        const activeSpan = tracer._startSpan(spanName, {
            childOf: parentSpan,
            domainName: DomainNames.STREAM,
            className: ClassNames.KINESIS,
            disableActiveStart: true,
            tags: {
                [SpanTags.OPERATION_TYPE]: operationType,
                [SpanTags.SPAN_TYPE]: SpanTypes.AWS_KINESIS,
                [AwsSDKTags.REQUEST_NAME]: operationName,
            },
        });

        if (request.params.StreamName) {
            activeSpan.setTag(SpanTags.TOPOLOGY_VERTEX, true);
            activeSpan.setTag(AwsKinesisTags.STREAM_NAME, request.params.StreamName);
        }

        return activeSpan;
    }

    public static createTraceLinks(span: ThundraSpan, request: any, response: any, config: any): any[] {
        const region = AWSServiceIntegration.getServiceRegion(request);
        const params = Object.assign({}, request.params);

        let traceLinks: any[] = [];

        const records = AWSServiceIntegration.getFromResponseData(response, 'Records', false);
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
            const shardId = AWSServiceIntegration.getFromResponseData(response, 'ShardId', false);
            const seqNumber = AWSServiceIntegration.getFromResponseData(response, 'SequenceNumber', false);
            if (shardId && seqNumber) {
                traceLinks = [`${region}:${streamName}:${shardId}:${seqNumber}`];
            }
        }

        return traceLinks;
    }

    public static processResponse(span: ThundraSpan, request: any, response: any, config: any): void {
        return;
    }

}

export class AWSDynamoDBIntegration {

    public static createSpan(tracer: any, request: any, config: any): ThundraSpan {
        const operationName = request.operation ? request.operation : AWS_SERVICE_REQUEST;
        const tableName = AWSDynamoDBIntegration.getDynamoDBTableName(request);
        const operationType = AWSServiceIntegration.getOperationType(operationName, ClassNames.DYNAMODB);
        const serviceEndpoint = AWSServiceIntegration.getServiceEndpoint(request);

        const spanName = tableName || AWS_SERVICE_REQUEST;
        const parentSpan = tracer.getActiveSpan();
        const activeSpan = tracer._startSpan(spanName, {
            childOf: parentSpan,
            domainName: DomainNames.DB,
            className: ClassNames.DYNAMODB,
            disableActiveStart: true,
            tags: {
                [DB_TYPE]: DBTypes.DYNAMODB,
                [DB_INSTANCE]: serviceEndpoint,
                [DBTags.DB_STATEMENT_TYPE]: operationType,
                [SpanTags.OPERATION_TYPE]: operationType,
                [SpanTags.SPAN_TYPE]: SpanTypes.AWS_DYNAMO,
                [AwsSDKTags.REQUEST_NAME]: operationName,
                [DBTags.DB_STATEMENT]: config.maskDynamoDBStatement ? undefined : { ...request.params },
            },
        });

        if (operationType) {
            activeSpan.setTag(SpanTags.TOPOLOGY_VERTEX, true);
            activeSpan.setTag(AwsDynamoTags.TABLE_NAME, tableName);
        }

        // Inject outgoing trace links into spans
        if (config.dynamoDBTraceInjectionEnabled) {
            if (operationName === 'putItem') {
                AWSDynamoDBIntegration.injectDynamoDBTraceLinkOnPut(request.params, activeSpan);
            } else if (operationName === 'updateItem') {
                AWSDynamoDBIntegration.injectDynamoDBTraceLinkOnUpdate(request.params, activeSpan);
            } else if (operationName === 'deleteItem') {
                AWSDynamoDBIntegration.injectDynamoDBTraceLinkOnDelete(request.params);
            }
        }

        return activeSpan;
    }

    public static createTraceLinks(span: ThundraSpan, request: any, response: any, config: any): any[] {
        const region = AWSServiceIntegration.getServiceRegion(request);
        const operationName = request.operation;
        const params = Object.assign({}, request.params);
        const tableName = AWSDynamoDBIntegration.getDynamoDBTableName(request);

        let traceLinks: any[] = [];
        let timestamp: number;

        if (AWSServiceIntegration.hasDateInResponse(response)) {
            timestamp = Date.parse(AWSServiceIntegration.getDateFromResponse(response)) / 1000;
        } else {
            timestamp = Math.floor(Date.now() / 1000) - 1;
        }

        if (operationName === 'putItem') {
            traceLinks = AWSDynamoDBIntegration.generateDynamoTraceLinks(params.Item, 'SAVE', tableName, region, timestamp);
        } else if (operationName === 'updateItem') {
            traceLinks = AWSDynamoDBIntegration.generateDynamoTraceLinks(params.Key, 'SAVE', tableName, region, timestamp);
        } else if (operationName === 'deleteItem') {
            if (config.dynamoDBTraceInjectionEnabled && AWSServiceIntegration.hasInResponseData(response, 'Attributes.x-thundra-span-id')) {
                const spanId = AWSServiceIntegration.getFromResponseData(response, 'Attributes.x-thundra-span-id');
                traceLinks = [`DELETE:${spanId}`];
            } else {
                traceLinks = AWSDynamoDBIntegration.generateDynamoTraceLinks(params.Key, 'DELETE', tableName, region, timestamp);
            }
        }

        return traceLinks;
    }

    public static processResponse(span: ThundraSpan, request: any, response: any, config: any): void {
        return;
    }

    public static generateDynamoTraceLinks(attributes: any, operationType: string,
                                           tableName: string, region: string, timestamp: number): any[] {
        if (attributes) {
            const attrHash = md5(AWSDynamoDBIntegration.serializeAttributes(attributes));
            return [0, 1, 2].map((i) => `${region}:${tableName}:${timestamp + i}:${operationType}:${attrHash}`);
        }
        return [];
    }

    private static getDynamoDBTableName(request: any): string {
        let tableName;

        if (request.params && request.params.TableName) {
            tableName = request.params.TableName;
        }

        if (request.params && request.params.RequestItems) {
            tableName = Object.keys(request.params.RequestItems).join(',');
        }

        return tableName;
    }

    private static serializeAttributes(attributes: any): string {
        return Object.keys(attributes).sort().map((attrKey) => {
            const attrType = Object.keys(attributes[attrKey])[0];
            const attrVal = trim(JSON.stringify(attributes[attrKey][attrType]), '"');
            return `${attrKey}={${attrType}: ${attrVal}}`;
        }).join(', ');
    }

    private static injectDynamoDBTraceLinkOnPut(requestParams: any, span: ThundraSpan): void {
        const spanId = span.spanContext.spanId;
        requestParams.Item = Object.assign({},
            { 'x-thundra-span-id': { S: spanId } },
            requestParams.Item,
        );
        span.setTag(SpanTags.TRACE_LINKS, [`SAVE:${spanId}`]);
    }

    private static injectDynamoDBTraceLinkOnUpdate(requestParams: any, span: ThundraSpan): void {
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

    private static injectDynamoDBTraceLinkOnDelete(requestParams: any): void {
        requestParams.ReturnValues = 'ALL_OLD';
    }

}

export class AWSS3Integration {

    public static createSpan(tracer: any, request: any, config: any): ThundraSpan {
        const operationName = request.operation ? request.operation : AWS_SERVICE_REQUEST;
        const operationType = AWSServiceIntegration.getOperationType(operationName, ClassNames.S3);
        const spanName = request.params.Bucket || AWS_SERVICE_REQUEST;

        const parentSpan = tracer.getActiveSpan();
        const activeSpan = tracer._startSpan(spanName, {
            childOf: parentSpan,
            domainName: DomainNames.STORAGE,
            className: ClassNames.S3,
            disableActiveStart: true,
            tags: {
                [SpanTags.SPAN_TYPE]: SpanTypes.AWS_S3,
                [SpanTags.OPERATION_TYPE]: operationType,
                [AwsS3Tags.BUCKET_NAME]: request.params.Bucket,
                [AwsSDKTags.REQUEST_NAME]: operationName,
            },
        });

        if (operationType) {
            activeSpan.setTag(SpanTags.TOPOLOGY_VERTEX, true);
            activeSpan.setTag(AwsS3Tags.OBJECT_NAME, request.params.Key);
        }

        return activeSpan;
    }

    public static createTraceLinks(span: ThundraSpan, request: any, response: any, config: any): any[] {
        const requestId = AWSServiceIntegration.getRequestIdFromResponse(response);

        let traceLinks: any[] = [];

        if (requestId) {
            traceLinks = [requestId];
        }

        return traceLinks;
    }

    static processResponse(span: ThundraSpan, request: any, response: any, config: any): void {
        return;
    }

}

export class AWSEventBridgeIntegration {

    public static createSpan(tracer: any, request: any, config: any): ThundraSpan {
        const operationName = request.operation ? request.operation : AWS_SERVICE_REQUEST;
        const operationType = AWSServiceIntegration.getOperationType(operationName, ClassNames.EVENTBRIDGE);
        let spanName = AwsEventBridgeTags.SERVICE_REQUEST;

        const eventBusMap: Set<string> = new Set<string>();
        const entries = [];
        for (const entry of request.params.Entries || []) {
            const eventBusName = get(entry, 'EventBusName', null);
            if (eventBusName) {
                eventBusMap.add(eventBusName);
            }
            entries.push({
                ...(!config.maskEventBridgeDetail) && { Detail: entry.Detail },
                DetailType: entry.DetailType,
                EventBusName: entry.EventBusName,
                Resources: entry.Resources,
                Source: entry.Source,
                Time: entry.Time,
            });
        }

        if (eventBusMap.size === 1) {
            spanName = eventBusMap.values().next().value;
        }

        const parentSpan = tracer.getActiveSpan();
        const activeSpan = tracer._startSpan(spanName, {
            childOf: parentSpan,
            domainName: DomainNames.MESSAGING,
            className: ClassNames.EVENTBRIDGE,
            disableActiveStart: true,
            tags: {
                [SpanTags.SPAN_TYPE]: SpanTypes.AWS_EVENTBRIDGE,
                [SpanTags.OPERATION_TYPE]: operationType,
                [AwsSDKTags.REQUEST_NAME]: operationName,
                [SpanTags.RESOURCE_NAMES]: entries.map((entry: any) => entry.DetailType),
                [AwsEventBridgeTags.ENTRIES]: entries,
                [AwsEventBridgeTags.EVENT_BUS_NAME]: spanName,
            },
        });

        if (operationType) {
            activeSpan.setTag(SpanTags.TOPOLOGY_VERTEX, true);
        }

        return activeSpan;
    }

    public static createTraceLinks(span: ThundraSpan, request: any, response: any, config: any): any[] {
        return AWSServiceIntegration.getFromResponseData(response, 'Entries', []).map((e: any) => e.EventId);
    }

    public static processResponse(span: ThundraSpan, request: any, response: any, config: any): void {
        return;
    }

}

export class AWSSESIntegration {

    public static createSpan(tracer: any, request: any, config: any): ThundraSpan {
        const operationName = request.operation ? request.operation : AWS_SERVICE_REQUEST;
        const operationType = AWSServiceIntegration.getOperationType(operationName, ClassNames.SES);

        const maskMail = ConfigProvider.get<boolean>(ConfigNames.THUNDRA_TRACE_INTEGRATIONS_AWS_SES_MAIL_MASK);
        const maskDestination = ConfigProvider.get<boolean>(ConfigNames.THUNDRA_TRACE_INTEGRATIONS_AWS_SES_MAIL_DESTINATION_MASK);

        const source = request.params.Source || [];
        const destination = maskDestination ? undefined : (request.params.Destination || request.params.Destinations || []);
        const subject = maskMail ? undefined : AWSServiceIntegration.getFromRequestParams(request, 'Message.Subject');
        const body = maskMail ? undefined : AWSServiceIntegration.getFromRequestParams(request, 'Message.Body');
        const templateName = request.params.Template;
        const templateArn = request.params.TemplateArn;
        const templateData = maskMail ? undefined : request.params.TemplateData;

        const spanName = operationName;

        const parentSpan = tracer.getActiveSpan();
        const activeSpan = tracer._startSpan(spanName, {
            childOf: parentSpan,
            domainName: DomainNames.MESSAGING,
            className: ClassNames.SES,
            disableActiveStart: true,
            tags: {
                [SpanTags.SPAN_TYPE]: SpanTypes.AWS_SES,
                [AwsSDKTags.REQUEST_NAME]: operationName,
                [SpanTags.OPERATION_TYPE]: operationType,
                [AwsSESTags.SOURCE]: source,
                [AwsSESTags.DESTINATION]: destination,
                [AwsSESTags.SUBJECT]: subject,
                [AwsSESTags.BODY]: body,
                [AwsSESTags.TEMPLATE_NAME]: templateName,
                [AwsSESTags.TEMPLATE_ARN]: templateArn,
                [AwsSESTags.TEMPLATE_DATA]: templateData,
            },
        });

        if (operationType) {
            activeSpan.setTag(SpanTags.TOPOLOGY_VERTEX, true);
        }

        return activeSpan;
    }

    public static createTraceLinks(span: ThundraSpan, request: any, response: any, config: any): any[] {
        return [];
    }

    public static processResponse(span: ThundraSpan, request: any, response: any, config: any): void {
        return;
    }

}
