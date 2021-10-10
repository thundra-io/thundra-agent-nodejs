import AwsUtil from './utils/aws.integration.utils';
import ThundraTracer from '../../dist/opentracing/Tracer';
import ExecutionContextManager from '../../dist/context/ExecutionContextManager';
import ExecutionContext from '../../dist/context/ExecutionContext';

import { AWSv3Integration } from '../../dist/integrations/AWSv3Integration';
import { AwsStepFunctionsTags } from '../../dist/Constants';

import * as AWS_S3 from '@aws-sdk/client-s3';
import * as AWS_SES from '@aws-sdk/client-ses';
import * as AWS_SNS from '@aws-sdk/client-sns';
import * as AWS_SQS from '@aws-sdk/client-sqs';
import * as AWS_DYNAMODB from '@aws-sdk/client-dynamodb';
import * as AWS_EVENTBRIDGE from '@aws-sdk/client-eventbridge';
import * as AWS_LAMBDA from '@aws-sdk/client-lambda';
import * as AWS_KINESIS from '@aws-sdk/client-kinesis';
import * as AWS_FIREHOSE from '@aws-sdk/client-firehose';
import * as AWS_ATHENA from '@aws-sdk/client-athena';
import * as AWS_SFN from '@aws-sdk/client-sfn';

const md5 = require('md5');

describe('AWS integration', () => {

    let tracer;
    let integration;

    beforeAll(() => {

        AWSv3Integration.prototype.getOriginalFunction = () => jest.fn((command, optionsOrCb, cb) => {

            cb(null, { });
        });

        tracer = new ThundraTracer();
        ExecutionContextManager.set(new ExecutionContext({ tracer }));
        integration = new AWSv3Integration();
    });

    afterEach(() => {
        tracer.destroy();
    });

    test('should instrument AWS S3 GetObjectCommand', async () => {

        const mockSend = jest.fn((command, optionsOrCb, cb) => {

            let currentInstance = mockSend.mock.instances[0];

            const thundraScope = currentInstance.__thundra__;
            if (thundraScope && thundraScope.response) {
                thundraScope.response.headers = {'x-amz-request-id': 'EXAMPLE_REQUEST_ID'};     
            }

            cb(null, {});
        });
        
        integration.getOriginalFunction = () => mockSend;

        await AwsUtil.sdk3Promisify(
            new AWS_S3.S3({ region: 'us-west-2' }),
            new AWS_S3.GetObjectCommand(AwsUtil.s3GetObject.params)
        );

        const span = tracer.getRecorder().spanList[0];

        expect(span.operationName).toBe('test');
        expect(span.className).toBe('AWS-S3');
        expect(span.domainName).toBe('Storage');
        expect(span.tags['operation.type']).toBe('READ');
        expect(span.tags['aws.s3.bucket.name']).toBe('test');
        expect(span.tags['aws.request.name']).toBe('getObject');
        expect(span.tags['aws.s3.object.name']).toBe(AwsUtil.s3GetObject.params.Key);
        expect(span.tags['topology.vertex']).toEqual(true);
        expect(span.tags['trace.links']).toEqual(['EXAMPLE_REQUEST_ID']);
        expect(span.finishTime).toBeTruthy();
    });

    test('should instrument AWS SES SendEmailCommand', async () => {

        await AwsUtil.sdk3Promisify(
            new AWS_SES.SES({ region: 'us-west-2' }),
            new AWS_SES.SendEmailCommand(AwsUtil.sesSendEmail.params)
        );

        const span = tracer.getRecorder().spanList[0];
        
        expect(span.operationName).toBe('sendEmail');

        expect(span.className).toBe('AWS-SES');
        expect(span.domainName).toBe('Messaging');

        expect(span.tags['aws.ses.mail.source']).toBe(AwsUtil.sesSendEmail.params.Source);
        expect(span.tags['aws.ses.mail.destination'].ToAddresses)
            .toContain(AwsUtil.sesSendEmail.params.Destination.ToAddresses[0]);
        expect(span.tags['aws.ses.mail.destination'].CcAddresses)
            .toContain(AwsUtil.sesSendEmail.params.Destination.CcAddresses[0]);

        expect(span.tags['aws.ses.mail.subject']).not.toBeTruthy();
        expect(span.tags['aws.ses.mail.body']).not.toBeTruthy();

        expect(span.tags['topology.vertex']).toEqual(true);
    });

    test('should instrument AWS SNS PublishCommand', async () => {

        integration.getOriginalFunction = () => jest.fn((command, optionsOrCb, cb) => {

            cb(null, { MessageId: 'EXAMPLE_MESSAGE_ID' });
        });

        const result = await AwsUtil.sdk3Promisify(
            new AWS_SNS.SNS({ region: 'us-west-2' }),
            new AWS_SNS.PublishCommand(AwsUtil.sns_topic.params)
        );

        const span = tracer.getRecorder().spanList[0];

        expect(span.operationName).toBe(AwsUtil.sns_topic.params.TopicArn);

        expect(span.className).toBe('AWS-SNS');
        expect(span.domainName).toBe('Messaging');

        expect(span.tags['aws.request.name']).toBe('publish');
        expect(span.tags['aws.sns.message']).toBe(AwsUtil.sns_topic.params.Message);
        expect(span.tags['aws.sns.topic.name']).toBe(AwsUtil.sns_topic.params.TopicArn);
        expect(span.tags['operation.type']).toBe('WRITE');
        expect(span.tags['topology.vertex']).toEqual(true);
        expect(span.tags['trace.links']).toEqual([result.MessageId]);
        expect(span.finishTime).toBeTruthy();
    });

    test('should instrument AWS SQS SendMessageCommand', async () => {

        integration.getOriginalFunction = () => jest.fn((command, optionsOrCb, cb) => {

            cb(null, { MessageId: 'EXAMPLE_MESSAGE_ID' });
        });

        const result = await AwsUtil.sdk3Promisify(
            new AWS_SQS.SQS({ region: 'us-west-2' }),
            new AWS_SQS.SendMessageCommand(AwsUtil.sqs.params)
        );

        const span = tracer.getRecorder().spanList[0];

        expect(span.operationName).toBe(AwsUtil.sqs.params.QueueName);

        expect(span.className).toBe('AWS-SQS');
        expect(span.domainName).toBe('Messaging');

        expect(span.tags['aws.sqs.message']).toBe(AwsUtil.sqs.params.MessageBody);
        expect(span.tags['aws.request.name']).toBe('sendMessage');
        expect(span.tags['aws.sqs.queue.name']).toBe(AwsUtil.sqs.params.QueueName);
        expect(span.tags['operation.type']).toBe('WRITE');
        expect(span.tags['topology.vertex']).toEqual(true);
        expect(span.tags['trace.links']).toEqual([result.MessageId]);
        expect(span.finishTime).toBeTruthy();
    });

    test('should instrument AWS Dynamodb PutItemCommand', async () => {

        integration.config.dynamoDBTraceInjectionEnabled = true;

        await AwsUtil.sdk3Promisify(
            new AWS_DYNAMODB.DynamoDBClient({ region: 'us-west-2' }),
            new AWS_DYNAMODB.PutItemCommand(AwsUtil.dynamo.params)
        );
        
        const span = tracer.getRecorder().spanList[0];

        expect(span.operationName).toBe(AwsUtil.dynamo.params.TableName);
        expect(span.className).toBe('AWS-DynamoDB');
        expect(span.domainName).toBe('DB');
        expect(span.tags['db.type']).toBe('aws-dynamodb');
        expect(span.tags['db.statement.type']).toBe('WRITE');
        expect(span.tags['aws.dynamodb.table.name']).toBe(AwsUtil.dynamo.params.TableName);
        expect(span.tags['operation.type']).toBe('WRITE');
        expect(span.tags['aws.request.name']).toBe('putItem');
        expect(span.tags['db.statement'].TableName).toEqual(AwsUtil.dynamo.params.TableName);
        expect(span.tags['db.statement'].Items).toEqual(AwsUtil.dynamo.params.Items);
        expect(span.tags['topology.vertex']).toEqual(true);
        expect(span.tags['trace.links']).toEqual([`SAVE:${span.spanContext.spanId}`]);
        expect(span.finishTime).toBeTruthy();
    });

    test('should instrument AWS EventBridge PutEventsCommand', async () => {

        await AwsUtil.sdk3Promisify(
            new AWS_EVENTBRIDGE.EventBridge({ region: 'us-west-2' }),
            new AWS_EVENTBRIDGE.PutEventsCommand(AwsUtil.eventBridgePutEvent.params)
        );

        const span = tracer.getRecorder().spanList[0];

        expect(span.operationName).toBe('default');

        expect(span.className).toBe('AWS-EventBridge');
        expect(span.domainName).toBe('Messaging');
        expect(span.tags['aws.request.name']).toBe('putEvents');
        expect(span.tags['operation.type']).toBe('WRITE');
        expect(span.tags['aws.eventbridge.eventbus.name']).toBe('default');
        expect(span.tags['resource.names']).toEqual(['detail-type-1', 'detail-type-2']);
        expect(span.tags['topology.vertex']).toEqual(true);
        expect(span.finishTime).toBeTruthy();
    });

    test('should instrument AWS Lambda InvokeCommand', async () => {

        const mockSend = jest.fn((command, optionsOrCb, cb) => {

            let currentInstance = mockSend.mock.instances[0];

            const thundraScope = currentInstance.__thundra__;
            if (thundraScope && thundraScope.response) {
                thundraScope.response.headers = {'x-amz-request-id': 'EXAMPLE_REQUEST_ID'};     
            }

            cb(null, {});
        });
        
        integration.getOriginalFunction = () => mockSend;

        await AwsUtil.sdk3Promisify(
            new AWS_LAMBDA.Lambda({ region: 'us-west-2' }),
            new AWS_LAMBDA.InvokeCommand(AwsUtil.lambda.params)
        );

        const span = tracer.getRecorder().spanList[0];

        expect(span.operationName).toBe('Test');

        expect(span.className).toBe('AWS-Lambda');
        expect(span.domainName).toBe('API');

        expect(span.tags['aws.lambda.name']).toBe('Test');
        expect(span.tags['aws.lambda.qualifier']).toBe(undefined);
        expect(span.tags['aws.lambda.invocation.payload']).toEqual('{ "name" : "thundra" }');
        expect(span.tags['aws.request.name']).toBe('invoke');
        expect(span.tags['aws.lambda.invocation.type']).toBe('RequestResponse');
        expect(span.tags['topology.vertex']).toEqual(true);
        expect(span.tags['trace.links']).toEqual(['EXAMPLE_REQUEST_ID']);
        expect(span.finishTime).toBeTruthy();
    });

    test('should instrument AWS Kinesis PutRecordCommand', async () => {

        const region = 'us-west-2';

        const mockSend = jest.fn((command, optionsOrCb, cb) => {

            let currentInstance = mockSend.mock.instances[0];

            const thundraScope = currentInstance.__thundra__;
            if (thundraScope && thundraScope.service) {
                thundraScope.service.config = {
                    region,
                    endpoint: `kinesis.${region}.amazonaws.com`,
                }
            }

            cb(null, { ShardId: 'SHARD_ID_1', SequenceNumber: 'SEQUENCE_NUMBER_1' });
        });

        integration.getOriginalFunction = () => mockSend;
   
        const result = await AwsUtil.sdk3Promisify(
            new AWS_KINESIS.Kinesis({ region }),
            new AWS_KINESIS.PutRecordCommand(AwsUtil.kinesis.params)
        );

        const span = tracer.getRecorder().spanList[0];

        expect(span.operationName).toBe('STRING_VALUE');

        expect(span.className).toBe('AWS-Kinesis');
        expect(span.domainName).toBe('Stream');

        expect(span.tags['aws.request.name']).toBe('putRecord');
        expect(span.tags['aws.kinesis.stream.name']).toBe('STRING_VALUE');
        expect(span.tags['operation.type']).toBe('WRITE');
        expect(span.tags['topology.vertex']).toEqual(true);
        expect(span.tags['trace.links']).toEqual([`${region}:STRING_VALUE:SHARD_ID_1:SEQUENCE_NUMBER_1`]);
        expect(span.finishTime).toBeTruthy();
    });

    test('should instrument AWS Firehose PutRecordCommand', async () => {

        const region = 'us-west-2';
        const date = 'Tue, 5 Apr 2019 22:12:31 GMT';
        const timestamp = Date.parse(date) / 1000;

        const mockSend = jest.fn((command, optionsOrCb, cb) => {

            let currentInstance = mockSend.mock.instances[0];

            const thundraScope = currentInstance.__thundra__;
            if (thundraScope) {
                if (thundraScope.response) {
                    thundraScope.response.headers = { date };     
                }
    
                if (thundraScope.service) {
                    thundraScope.service.config = {
                        region,
                        endpoint: `kinesis.${region}.amazonaws.com`,
                    }
                }
            }

            cb(null, {});
        });

        integration.getOriginalFunction = () => mockSend;
   
        await AwsUtil.sdk3Promisify(
            new AWS_FIREHOSE.Firehose({ region }),
            new AWS_FIREHOSE.PutRecordCommand(AwsUtil.firehose.params)
        );

        const dataHash = md5('STRING_VALUE');
        const traceLinks = [0, 1, 2].map((i) => `${region}:STRING_VALUE:${timestamp + i}:${dataHash}`);

        const span = tracer.getRecorder().spanList[0];

        expect(span.operationName).toBe('STRING_VALUE');

        expect(span.className).toBe('AWS-Firehose');
        expect(span.domainName).toBe('Stream');

        expect(span.tags['aws.request.name']).toBe('putRecord');
        expect(span.tags['aws.firehose.stream.name']).toBe('STRING_VALUE');
        expect(span.tags['operation.type']).toBe('WRITE');
        expect(span.tags['topology.vertex']).toEqual(true);
        expect(span.tags['trace.links']).toEqual(traceLinks);
        expect(span.finishTime).toBeTruthy();
    });

    test('should instrument AWS Step Functions StartExecutionCommand', async () => {

        await AwsUtil.sdk3Promisify(
            new AWS_SFN.SFN({ region: 'us-west-2' }),
            new AWS_SFN.StartExecutionCommand(AwsUtil.stepfn.params)
        );

        const span = tracer.getRecorder().spanList[0];

        expect(span.operationName).toBe('FooStateMachine');

        expect(span.className).toBe('AWS-StepFunctions');
        expect(span.domainName).toBe('AWS');

        expect(span.tags['aws.request.name']).toBe('startExecution');
        expect(span.tags[AwsStepFunctionsTags.EXECUTION_NAME]).toBe('execName');
        expect(span.tags[AwsStepFunctionsTags.EXECUTION_INPUT]).toBe('{}');
        expect(span.tags[AwsStepFunctionsTags.STATE_MACHINE_ARN])
            .toBe('arn:aws:states:us-west-2:123123123123:stateMachine:FooStateMachine');
        expect(span.tags['operation.type']).toBe('EXECUTE');
        expect(span.tags['topology.vertex']).toEqual(true);
        expect(span.tags['trace.links']).toBeTruthy();
        expect(span.finishTime).toBeTruthy();
    });

    test('should instrument AWS Athena StartQueryExecutionCommand', async () => {

        await AwsUtil.sdk3Promisify(
            new AWS_ATHENA.Athena({ region: 'us-west-2' }),
            new AWS_ATHENA.StartQueryExecutionCommand(AwsUtil.athenaStartQueryExec.params)
        );

        const span = tracer.getRecorder().spanList[0];

        expect(span.operationName).toBe('sample-db');

        expect(span.className).toBe('AWS-Athena');
        expect(span.domainName).toBe('DB');

        expect(span.tags['aws.request.name']).toBe('startQueryExecution');
        expect(span.tags['operation.type']).toBe('WRITE');
        expect(span.tags['db.instance']).toBe('sample-db');
        expect(span.tags['db.statement']).toBe('sample-query');
        expect(span.tags['aws.athena.s3.outputLocation']).toBe('sample-output-location');
        expect(span.tags['aws.athena.request.query.executionIds']).toBeUndefined();
        expect(span.tags['aws.athena.request.namedQuery.ids']).toBeUndefined();
        expect(span.tags['topology.vertex']).toEqual(true);
        expect(span.finishTime).toBeTruthy();
    });
});
