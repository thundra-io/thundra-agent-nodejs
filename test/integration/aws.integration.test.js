import AWS from './utils/aws.integration.utils';
import { AWSIntegration } from '../../dist/integrations/AWSIntegration';
import ThundraTracer from '../../dist/opentracing/Tracer';
import ExecutionContextManager from '../../dist/context/ExecutionContextManager';
import ExecutionContext from '../../dist/context/ExecutionContext';

const md5 = require('md5');
const sdk = require('aws-sdk');

beforeAll(() => {
    AWSIntegration.prototype.getOriginalFunction = jest.fn(() => {
        return (cb) => {
            cb(Error('foo error'), null);
        };
    });
});

describe('AWS integration', () => {
    let tracer;
    let integration;

    beforeAll(() => {
        tracer = new ThundraTracer();
        ExecutionContextManager.set(new ExecutionContext({ tracer }));
        integration = new AWSIntegration();
    });

    afterEach(() => {
        tracer.destroy();
    });

    test('should instrument AWS DynamoDB calls ', () => {
        integration.config.dynamoDBTraceInjectionEnabled = true;

        return AWS.dynamo(sdk).then(() => {
            const span = tracer.getRecorder().spanList[0];

            expect(span.operationName).toBe('test-table');
            expect(span.className).toBe('AWS-DynamoDB');
            expect(span.domainName).toBe('DB');
            expect(span.tags['db.type']).toBe('aws-dynamodb');
            expect(span.tags['db.instance']).toBe('dynamodb.us-west-2.amazonaws.com');
            expect(span.tags['db.statement.type']).toBe('WRITE');
            expect(span.tags['aws.dynamodb.table.name']).toBe('test-table');
            expect(span.tags['operation.type']).toBe('WRITE');
            expect(span.tags['aws.request.name']).toBe('putItem');
            expect(span.tags['db.statement']).toEqual({ TableName: 'test-table', Item: {id:{S:'1'}}});
            expect(span.tags['topology.vertex']).toEqual(true);
            expect(span.tags['trace.links']).toEqual([`SAVE:${span.spanContext.spanId}`]);
            expect(span.finishTime).toBeTruthy();
        });
    });

    test('should mask AWS DynamoDB statements ', () => {
        integration.config.disableInstrumentation = true;
        integration.config.maskDynamoDBStatement = true;
        integration.config.dynamoDBTraceInjectionEnabled = true;

        return AWS.dynamo(sdk).then(() => {
            const span = tracer.getRecorder().spanList[0];

            expect(span.tags['db.statement']).not.toBeTruthy();

            expect(span.operationName).toBe('test-table');
            expect(span.className).toBe('AWS-DynamoDB');
            expect(span.domainName).toBe('DB');
            expect(span.tags['db.type']).toBe('aws-dynamodb');
            expect(span.tags['db.instance']).toBe('dynamodb.us-west-2.amazonaws.com');
            expect(span.tags['db.statement.type']).toBe('WRITE');
            expect(span.tags['aws.dynamodb.table.name']).toBe('test-table');
            expect(span.tags['operation.type']).toBe('WRITE');
            expect(span.tags['aws.request.name']).toBe('putItem');
            expect(span.tags['topology.vertex']).toEqual(true);
            expect(span.tags['trace.links']).toEqual([`SAVE:${span.spanContext.spanId}`]);
            expect(span.finishTime).toBeTruthy();
        });
    });

    test('should instrument AWS S3 GetObject call ', () => {
        // Replace actual send function used by AWS SDK
        // with our mockSend function
        const mockSend = jest.fn((cb) => {
            let req = mockSend.mock.instances[0];
            req.response = {
                httpResponse: {
                    headers: {'x-amz-request-id': 'EXAMPLE_REQUEST_ID_123'}
                }
            };
            cb(null, {result: 'success'});
        });

        integration.getOriginalFunction = () => mockSend;

        return AWS.s3GetObject(sdk).then(() => {
            const span = tracer.getRecorder().spanList[0];

            expect(span.operationName).toBe('test');
            expect(span.className).toBe('AWS-S3');
            expect(span.domainName).toBe('Storage');
            expect(span.tags['operation.type']).toBe('READ');
            expect(span.tags['aws.s3.bucket.name']).toBe('test');
            expect(span.tags['aws.request.name']).toBe('getObject');
            expect(span.tags['aws.s3.object.name']).toBe('test.txt');
            expect(span.tags['topology.vertex']).toEqual(true);
            expect(span.tags['trace.links']).toEqual(['EXAMPLE_REQUEST_ID_123']);
            expect(span.finishTime).toBeTruthy();
        });
    });

    test('should instrument AWS S3 ListBucket call ', () => {
        // Replace actual send function used by AWS SDK
        // with our mockSend function
        const mockSend = jest.fn((cb) => {
            let req = mockSend.mock.instances[0];
            req.response = {
                httpResponse: {
                    headers: {'x-amz-request-id': 'EXAMPLE_REQUEST_ID_123'}
                }
            };
            cb(null, {result: 'success'});
        });
        integration.getOriginalFunction = () => mockSend;

        return AWS.s3ListBuckets(sdk).then(() => {
            const span = tracer.getRecorder().spanList[0];

            expect(span.operationName).toBe('AWSServiceRequest');

            expect(span.className).toBe('AWS-S3');
            expect(span.domainName).toBe('Storage');

            expect(span.tags['operation.type']).toBe('LIST');
            expect(span.tags['aws.s3.bucket.name']).not.toBeTruthy();
            expect(span.tags['aws.request.name']).toBe('listBuckets');
            expect(span.tags['aws.s3.object.name']).not.toBeTruthy();
            expect(span.tags['topology.vertex']).toEqual(true);
            expect(span.tags['trace.links']).toEqual(['EXAMPLE_REQUEST_ID_123']);
            expect(span.finishTime).toBeTruthy();
        });
    });

    test('should instrument AWS Lambda invoke call ', () => {
        // Replace actual send function used by AWS SDK
        // with our mockSend function
        const mockSend = jest.fn((cb) => {
            let req = mockSend.mock.instances[0];
            req.response = {
                httpResponse: {
                    headers: {'x-amzn-requestid': 'EXAMPLE_REQUEST_ID_123'}
                }
            };
            cb(null, {result: 'success'});
        });
        integration.getOriginalFunction = () => mockSend;

        return AWS.lambda(sdk).then(() => {
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
            expect(span.tags['trace.links']).toEqual(['EXAMPLE_REQUEST_ID_123']);
            expect(span.finishTime).toBeTruthy();
        });
    });

    test('should mask AWS Lambda Payload', () => {
        integration.config.maskLambdaPayload = true;
        // Replace actual send function used by AWS SDK
        // with our mockSend function
        const mockSend = jest.fn((cb) => {
            let req = mockSend.mock.instances[0];
            req.response = {
                httpResponse: {
                    headers: {'x-amzn-requestid': 'EXAMPLE_REQUEST_ID_123'}
                }
            };
            cb(null, {result: 'success'});
        });
        integration.getOriginalFunction = () => mockSend;

        return AWS.lambda(sdk).then(() => {
            const span = tracer.getRecorder().spanList[0];

            expect(span.operationName).toBe('Test');

            expect(span.className).toBe('AWS-Lambda');
            expect(span.domainName).toBe('API');

            expect(span.tags['aws.lambda.invocation.payload']).not.toBeTruthy();
        });
    });

    test('should instrument AWS SQS calls ', () => {
        // Replace actual send function used by AWS SDK
        // with our mockSend function
        const mockSend = jest.fn((cb) => {
            let req = mockSend.mock.instances[0];
            req.response = {
                data: {
                    MessageId: 'EXAMPLE_MESSAGE_ID_123',
                }
            };
            cb(null, {result: 'success'});
        });
        integration.getOriginalFunction = () => mockSend;

        return AWS.sqs(sdk).then(() => {
            const span = tracer.getRecorder().spanList[0];

            expect(span.operationName).toBe('MyQueue');

            expect(span.className).toBe('AWS-SQS');
            expect(span.domainName).toBe('Messaging');

            expect(span.tags['aws.sqs.message']).toBe('Hello Thundra!');
            expect(span.tags['aws.request.name']).toBe('sendMessage');
            expect(span.tags['aws.sqs.queue.name']).toBe('MyQueue');
            expect(span.tags['operation.type']).toBe('WRITE');
            expect(span.tags['topology.vertex']).toEqual(true);
            expect(span.tags['trace.links']).toEqual(['EXAMPLE_MESSAGE_ID_123']);
            expect(span.finishTime).toBeTruthy();
        });
    });

    test('should mask AWS SQS message ', () => {
        integration.config.maskSQSMessage = true;
        // Replace actual send function used by AWS SDK
        // with our mockSend function
        const mockSend = jest.fn((cb) => {
            let req = mockSend.mock.instances[0];
            req.response = {
                data: {
                    MessageId: 'EXAMPLE_MESSAGE_ID_123',
                }
            };
            cb(null, {result: 'success'});
        });

        integration.getOriginalFunction = () => mockSend;

        return AWS.sqs(sdk).then(() => {
            const span = tracer.getRecorder().spanList[0];

            expect(span.operationName).toBe('MyQueue');

            expect(span.className).toBe('AWS-SQS');
            expect(span.domainName).toBe('Messaging');

            expect(span.tags['aws.sqs.message']).not.toBeTruthy();
        });
    });

    test('should instrument AWS sqs_list_queue calls', () => {
        return AWS.sqs_list_queue(sdk).then(() => {
            const span = tracer.getRecorder().spanList[0];

            expect(span.operationName).toBe('AWSServiceRequest');

            expect(span.className).toBe('AWS-SQS');
            expect(span.domainName).toBe('Messaging');

            expect(span.tags['aws.request.name']).toBe('listQueues');
            expect(span.tags['aws.sqs.queue.name']).not.toBeTruthy();
            expect(span.tags['operation.type']).toBe('LIST');
            expect(span.tags['topology.vertex']).toEqual(true);
            expect(span.tags['trace.links']).toEqual(undefined);
            expect(span.finishTime).toBeTruthy();
        });
    });


    test('should instrument AWS SNS publish to topic calls ', () => {
        // Replace actual send function used by AWS SDK
        // with our mockSend function
        const mockSend = jest.fn((cb) => {
            let req = mockSend.mock.instances[0];
            req.response = {
                data: {
                    MessageId: 'EXAMPLE_MESSAGE_ID_123',
                }
            };
            cb(null, {result: 'success'});
        });

        integration.getOriginalFunction = () => mockSend;

        return AWS.sns_topic(sdk).then(() => {
            const span = tracer.getRecorder().spanList[0];

            expect(span.operationName).toBe('TEST_TOPIC');

            expect(span.className).toBe('AWS-SNS');
            expect(span.domainName).toBe('Messaging');

            expect(span.tags['aws.request.name']).toBe('publish');
            expect(span.tags['aws.sns.message']).toBe('Hello Thundra!');
            expect(span.tags['aws.sns.topic.name']).toBe('TEST_TOPIC');
            expect(span.tags['operation.type']).toBe('WRITE');
            expect(span.tags['topology.vertex']).toEqual(true);
            expect(span.tags['trace.links']).toEqual(['EXAMPLE_MESSAGE_ID_123']);
            expect(span.finishTime).toBeTruthy();
        });
    });

    test('should instrument AWS SNS publish to target calls ', () => {
        // Replace actual send function used by AWS SDK
        // with our mockSend function
        const mockSend = jest.fn((cb) => {
            let req = mockSend.mock.instances[0];
            req.response = {
                data: {
                    MessageId: 'EXAMPLE_MESSAGE_ID_123',
                }
            };
            cb(null, {result: 'success'});
        });

        integration.getOriginalFunction = () => mockSend;

        return AWS.sns_target(sdk).then(() => {
            const span = tracer.getRecorder().spanList[0];

            expect(span.operationName).toBe('TEST_TARGET');

            expect(span.className).toBe('AWS-SNS');
            expect(span.domainName).toBe('Messaging');

            expect(span.tags['aws.request.name']).toBe('publish');
            expect(span.tags['aws.sns.message']).toBe('Hello Thundra!');
            expect(span.tags['aws.sns.target.name']).toBe('TEST_TARGET');
            expect(span.tags['operation.type']).toBe('WRITE');
            expect(span.tags['topology.vertex']).toEqual(true);
            expect(span.tags['trace.links']).toEqual(['EXAMPLE_MESSAGE_ID_123']);
            expect(span.finishTime).toBeTruthy();
        });
    });

    test('should instrument AWS SNS publish to SMS calls ', () => {
        // Replace actual send function used by AWS SDK
        // with our mockSend function
        const mockSend = jest.fn((cb) => {
            let req = mockSend.mock.instances[0];
            req.response = {
                data: {
                    MessageId: 'EXAMPLE_MESSAGE_ID_123',
                }
            };
            cb(null, {result: 'success'});
        });

        integration.getOriginalFunction = () => mockSend;

        return AWS.sns_sms(sdk).then(() => {
            const span = tracer.getRecorder().spanList[0];

            expect(span.operationName).toBe('+901234567890');

            expect(span.className).toBe('AWS-SNS');
            expect(span.domainName).toBe('Messaging');

            expect(span.tags['aws.request.name']).toBe('publish');
            expect(span.tags['aws.sns.message']).toBe('Hello Thundra!');
            expect(span.tags['aws.sns.sms.phone_number']).toBe('+901234567890');
            expect(span.tags['operation.type']).toBe('WRITE');
            expect(span.tags['topology.vertex']).toEqual(true);
            expect(span.tags['trace.links']).toEqual(['EXAMPLE_MESSAGE_ID_123']);
            expect(span.finishTime).toBeTruthy();
        });
    });

    test('should instrument AWS SNS call without publish', () => {
        return AWS.sns_checkIfPhoneNumberIsOptedOut(sdk).then(() => {
            const span = tracer.getRecorder().spanList[0];

            expect(span.operationName).toBe('AWSServiceRequest');

            expect(span.className).toBe('AWS-SNS');
            expect(span.domainName).toBe('Messaging');

            expect(span.tags['aws.request.name']).toBe('checkIfPhoneNumberIsOptedOut');
            expect(span.tags['aws.sns.topic.name']).toBe(undefined);
            expect(span.tags['operation.type']).toBe('READ');
            expect(span.finishTime).toBeTruthy();
        });
    });

    test('should mask SNS Message', () => {
        return AWS.sns_checkIfPhoneNumberIsOptedOut(sdk).then(() => {
            const span = tracer.getRecorder().spanList[0];

            expect(span.operationName).toBe('AWSServiceRequest');

            expect(span.className).toBe('AWS-SNS');
            expect(span.domainName).toBe('Messaging');

            expect(span.tags['aws.sns.message']).not.toBeTruthy();
        });
    });

    test('should instrument AWS Kinesis calls ', () => {
        // Replace actual send function used by AWS SDK
        // with our mockSend function
        const mockSend = jest.fn((cb) => {
            let req = mockSend.mock.instances[0];
            req.response = {
                data: {
                    Records: [
                        {ShardId: 'SHARD_ID_1', SequenceNumber: 'SEQUENCE_NUMBER_1'},
                        {ShardId: 'SHARD_ID_2', SequenceNumber: 'SEQUENCE_NUMBER_2'},
                    ],
                }
            };
            cb(null, {result: 'success'});
        });

        integration.getOriginalFunction = () => mockSend;

        return AWS.kinesis(sdk).then(() => {
            const span = tracer.getRecorder().spanList[0];
            expect(span.operationName).toBe('STRING_VALUE');

            expect(span.className).toBe('AWS-Kinesis');
            expect(span.domainName).toBe('Stream');

            expect(span.tags['aws.request.name']).toBe('putRecord');
            expect(span.tags['aws.kinesis.stream.name']).toBe('STRING_VALUE');
            expect(span.tags['operation.type']).toBe('WRITE');
            expect(span.tags['topology.vertex']).toEqual(true);
            expect(span.tags['trace.links']).toEqual(['us-west-2:STRING_VALUE:SHARD_ID_1:SEQUENCE_NUMBER_1',
                'us-west-2:STRING_VALUE:SHARD_ID_2:SEQUENCE_NUMBER_2']);
            expect(span.finishTime).toBeTruthy();
        });
    });

    test('should instrument AWS Firehose calls ', () => {
        // Replace actual send function used by AWS SDK
        // with our mockSend function
        const date = 'Tue, 5 Apr 2019 22:12:31 GMT';
        const timestamp = Date.parse(date) / 1000;
        const mockSend = jest.fn((cb) => {
            let req = mockSend.mock.instances[0];
            req.response = {
                httpResponse: {
                    headers: {date: date},
                },
            };
            cb(null, {result: 'success'});
        });

        integration.getOriginalFunction = () => mockSend;

        const dataHash = md5('STRING_VALUE');
        const traceLinks = [0, 1, 2].map((i) => `us-west-2:STRING_VALUE:${timestamp + i}:${dataHash}`);

        return AWS.firehose(sdk).then(() => {
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
    });

    test('should instrument AWS Athena calls ', () => {
        return AWS.athenaStartQueryExec(sdk).then(() => {
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

    test('should instrument AWS Athena statement masked ', () => {
        integration.config.maskAthenaStatement = true;
        return AWS.athenaStartQueryExec(sdk).then(() => {
            const span = tracer.getRecorder().spanList[0];
            expect(span.operationName).toBe('sample-db');

            expect(span.className).toBe('AWS-Athena');
            expect(span.domainName).toBe('DB');

            expect(span.tags['aws.request.name']).toBe('startQueryExecution');
            expect(span.tags['operation.type']).toBe('WRITE');
            expect(span.tags['db.instance']).toBe('sample-db');
            expect(span.tags['db.statement']).toBeUndefined();
            expect(span.tags['aws.athena.s3.outputLocation']).toBe('sample-output-location');
            expect(span.tags['aws.athena.request.query.executionIds']).toBeUndefined();
            expect(span.tags['aws.athena.request.namedQuery.ids']).toBeUndefined();
            expect(span.tags['topology.vertex']).toEqual(true);
            expect(span.finishTime).toBeTruthy();
        });
    });

    test('should instrument AWS Athena stop query execution ', () => {
        return AWS.athenaStopQueryExec(sdk).then(() => {
            const span = tracer.getRecorder().spanList[0];
            expect(span.operationName).toBe('AWSServiceRequest');

            expect(span.className).toBe('AWS-Athena');
            expect(span.domainName).toBe('DB');

            expect(span.tags['aws.request.name']).toBe('stopQueryExecution');
            expect(span.tags['operation.type']).toBe('WRITE');
            expect(span.tags['db.instance']).toBeUndefined();
            expect(span.tags['db.statement']).toBeUndefined();
            expect(span.tags['aws.athena.s3.outputLocation']).toBeUndefined();
            expect(span.tags['aws.athena.request.query.executionIds']).toEqual(['sample-query-execution-id']);
            expect(span.tags['aws.athena.request.namedQuery.ids']).toBeUndefined();
            expect(span.tags['topology.vertex']).toEqual(true);
            expect(span.finishTime).toBeTruthy();
        });
    });

    test('should instrument AWS Athena batch get named query ', () => {
        integration.config.maskAthenaStatement = false;
        return AWS.athenaBatchGetNamedQuery(sdk).then(() => {
            const span = tracer.getRecorder().spanList[0];
            expect(span.operationName).toBe('AWSServiceRequest');

            expect(span.className).toBe('AWS-Athena');
            expect(span.domainName).toBe('DB');

            expect(span.tags['aws.request.name']).toBe('batchGetNamedQuery');
            expect(span.tags['operation.type']).toBe('READ');
            expect(span.tags['db.instance']).toBeUndefined();
            expect(span.tags['db.statement']).toBeUndefined();
            expect(span.tags['aws.athena.s3.outputLocation']).toBeUndefined();
            expect(span.tags['aws.athena.request.query.executionIds']).toBeUndefined();
            expect(span.tags['aws.athena.request.namedQuery.ids']).toEqual(['sample-id-1', 'sample-id-2']);
            expect(span.tags['topology.vertex']).toEqual(true);
            expect(span.finishTime).toBeTruthy();
        });
    });

    test('should instrument AWS Athena batch get query execution ', () => {
        return AWS.athenaBatchGetQueryExec(sdk).then(() => {
            const span = tracer.getRecorder().spanList[0];
            expect(span.operationName).toBe('AWSServiceRequest');

            expect(span.className).toBe('AWS-Athena');
            expect(span.domainName).toBe('DB');

            expect(span.tags['aws.request.name']).toBe('batchGetQueryExecution');
            expect(span.tags['operation.type']).toBe('READ');
            expect(span.tags['db.instance']).toBeUndefined();
            expect(span.tags['db.statement']).toBeUndefined();
            expect(span.tags['aws.athena.s3.outputLocation']).toBeUndefined();
            expect(span.tags['aws.athena.request.query.executionIds']).toEqual(['sample-id-1', 'sample-id-2']);
            expect(span.tags['aws.athena.request.namedQuery.ids']).toBeUndefined();
            expect(span.tags['topology.vertex']).toEqual(true);
            expect(span.finishTime).toBeTruthy();
        });
    });

    test('should instrument AWS Athena create named query ', () => {
        const mockSend = jest.fn((cb) => {
            let req = mockSend.mock.instances[0];
            req.response = {
                data: {
                    NamedQueryId: 'sample-named-query-id',
                },
            };
            cb(null, {result: 'success'});
        });

        integration.getOriginalFunction = () => mockSend;

        return AWS.athenaCreateNamedQuery(sdk).then(() => {
            const span = tracer.getRecorder().spanList[0];
            expect(span.operationName).toBe('sample-db');

            expect(span.className).toBe('AWS-Athena');
            expect(span.domainName).toBe('DB');

            expect(span.tags['aws.request.name']).toBe('createNamedQuery');
            expect(span.tags['operation.type']).toBe('WRITE');
            expect(span.tags['db.instance']).toBe('sample-db');
            expect(span.tags['db.statement']).toBe('sample-query');
            expect(span.tags['aws.athena.s3.outputLocation']).toBeUndefined();
            expect(span.tags['aws.athena.request.query.executionIds']).toBeUndefined();
            expect(span.tags['aws.athena.request.namedQuery.ids']).toBeUndefined();
            expect(span.tags['aws.athena.response.namedQuery.ids']).toEqual(['sample-named-query-id']);
            expect(span.tags['topology.vertex']).toEqual(true);
            expect(span.finishTime).toBeTruthy();
        });
    });

    test('should instrument AWS EventBridge calls ', () => {
        return AWS.eventBridgePutEvent(sdk).then(() => {
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
    });

    test('should instrument AWS EventBridge calls with different bus ', () => {
        return AWS.eventBridgePutEventDifferentBus(sdk).then(() => {
            const span = tracer.getRecorder().spanList[0];
            expect(span.operationName).toBe('AWSEventBridgeRequest');

            expect(span.className).toBe('AWS-EventBridge');
            expect(span.domainName).toBe('Messaging');
            expect(span.tags['aws.request.name']).toBe('putEvents');
            expect(span.tags['operation.type']).toBe('WRITE');
            expect(span.tags['aws.eventbridge.eventbus.name']).toBe('AWSEventBridgeRequest');
            expect(span.tags['resource.names']).toEqual(['detail-type-1', 'detail-type-2']);
            expect(span.tags['topology.vertex']).toEqual(true);
            expect(span.finishTime).toBeTruthy();
        });
    });


    test('should instrument AWS EventBridge listEventBuses call ', () => {
        // Replace actual send function used by AWS SDK
        // with our mockSend function
        const mockSend = jest.fn((cb) => {
            let req = mockSend.mock.instances[0];
            req.response = {
                httpResponse: {
                    headers: {'x-amz-request-id': 'EXAMPLE_REQUEST_ID_123'}
                }
            };
            cb(null, {result: 'success'});
        });
        integration.getOriginalFunction = () => mockSend;

        return AWS.eventBridgeListEventBuses(sdk).then(() => {
            const span = tracer.getRecorder().spanList[0];

            expect(span.operationName).toBe('AWSEventBridgeRequest');

            expect(span.className).toBe('AWS-EventBridge');
            expect(span.domainName).toBe('Messaging');

            expect(span.tags['operation.type']).toBe('LIST');
            expect(span.tags['aws.eventbridge.eventbus.name']).toBe('AWSEventBridgeRequest');
            expect(span.tags['aws.request.name']).toBe('listEventBuses');
            expect(span.tags['topology.vertex']).toEqual(true);
            expect(span.finishTime).toBeTruthy();
        });
    });

    test('should instrument AWS KMS calls ', () => {
        return AWS.kms(sdk).then(() => {
            const span = tracer.getRecorder().spanList[0];
            expect(span.operationName).toBe('AWSServiceRequest');

            expect(span.className).toBe('AWSService');
            expect(span.domainName).toBe('AWS');

            expect(span.tags['aws.request.name']).toBe('createKey');
            expect(span.finishTime).toBeTruthy();
        });
    });

    test('should instrument AWS SES sendEmail ', () => {
        return AWS.sesSendEmail(sdk).then(() => {
            const span = tracer.getRecorder().spanList[0];
            expect(span.operationName).toBe('sendEmail');

            expect(span.className).toBe('AWS-SES');
            expect(span.domainName).toBe('Messaging');

            expect(span.tags['aws.ses.mail.source']).toBe('demo@thundra.io');
            expect(span.tags['aws.ses.mail.destination'].ToAddresses).toContain('test@thundra.io');
            expect(span.tags['aws.ses.mail.destination'].CcAddresses).toContain('test-cc@thundra.io');

            expect(span.tags['aws.ses.mail.subject']).not.toBeTruthy();
            expect(span.tags['aws.ses.mail.body']).not.toBeTruthy();

            expect(span.tags['topology.vertex']).toEqual(true);
        });
    });

    test('should instrument AWS SES sendRawEmail ', () => {
        return AWS.sesSendRawEmail(sdk).then(() => {
            const span = tracer.getRecorder().spanList[0];
            expect(span.operationName).toBe('sendRawEmail');

            expect(span.className).toBe('AWS-SES');
            expect(span.domainName).toBe('Messaging');

            expect(span.tags['aws.ses.mail.source']).toBe('demo@thundra.io');
            expect(span.tags['aws.ses.mail.destination']).toContain('test@thundra.io');

            expect(span.tags['topology.vertex']).toEqual(true);
        });
    });

    test('should instrument AWS SES sendTemplatedEmail ', () => {
        return AWS.sesSendTemplatedEmail(sdk).then(() => {
            const span = tracer.getRecorder().spanList[0];
            expect(span.operationName).toBe('sendTemplatedEmail');

            expect(span.className).toBe('AWS-SES');
            expect(span.domainName).toBe('Messaging');

            expect(span.tags['aws.ses.mail.source']).toBe('demo@thundra.io');
            expect(span.tags['aws.ses.mail.destination'].ToAddresses).toContain('test@thundra.io');
            expect(span.tags['aws.ses.mail.template.name']).toBe('TestTemplate');
            expect(span.tags['aws.ses.mail.template.arn']).toBe('test');
            expect(span.tags['aws.ses.mail.template.data']).not.toBeTruthy();

            expect(span.tags['topology.vertex']).toEqual(true);
        });
    });

    test('should get correct operationTypes', () => {
        if (!AWSIntegration.AWSOperationTypes) {
            AWSIntegration.parseAWSOperationTypes();
        }
        const testCases = [
            // Exception cases
            { className: 'AWS-Lambda', operationName: 'ListTags', expected: 'READ'},
            { className: 'AWS-Lambda', operationName: 'EnableReplication', expected: 'PERMISSION'},
            { className: 'AWS-S3', operationName: 'HeadBucket', expected: 'LIST'},
            { className: 'AWS-S3', operationName: 'ListJobs', expected: 'READ'},
            { className: 'AWS-SNS', operationName: 'OptInPhoneNumber', expected: 'WRITE'},
            { className: 'AWS-SNS', operationName: 'ListPhoneNumbersOptedOut', expected: 'READ'},
            { className: 'AWS-Athena', operationName: 'BatchGetQueryExecution', expected: 'READ'},
            { className: 'AWS-Athena', operationName: 'UntagResource', expected: 'TAGGING'},
            { className: 'AWS-Kinesis', operationName: 'RegisterStreamConsumer', expected: 'WRITE'},
            { className: 'AWS-Kinesis', operationName: 'SplitShard', expected: 'WRITE'},
            { className: 'AWS-Firehose', operationName: 'StopDeliveryStreamEncryption', expected: 'WRITE'},
            { className: 'AWS-Firehose', operationName: 'DescribeDeliveryStream', expected: 'LIST'},
            { className: 'AWS-SQS', operationName: 'PurgeQueue', expected: 'WRITE'},
            { className: 'AWS-SQS', operationName: 'ListQueueTags', expected: 'READ'},
            { className: 'AWS-DynamoDB', operationName: 'PurchaseReservedCapacityOfferings', expected: 'WRITE'},
            { className: 'AWS-DynamoDB', operationName: 'Scan', expected: 'READ'},
            { className: 'AWS-EventBridge', operationName: 'TestEventPattern', expected: 'READ'},
            { className: 'AWS-EventBridge', operationName: 'ActivateEventSource', expected: 'WRITE'},
            // Check according to patterns
            { className: 'AWS-DynamoDB', operationName: 'ListFooOperation', expected: 'LIST'},
            { className: 'AWS-DynamoDB', operationName: 'GetFooOperation', expected: 'READ'},
            { className: 'AWS-DynamoDB', operationName: 'CreateFooOperation', expected: 'WRITE'},
            { className: 'AWS-DynamoDB', operationName: 'DeleteFooOperation', expected: 'WRITE'},
            { className: 'AWS-DynamoDB', operationName: 'InvokeFooOperation', expected: 'WRITE'},
            { className: 'AWS-DynamoDB', operationName: 'PublishFooOperation', expected: 'WRITE'},
            { className: 'AWS-DynamoDB', operationName: 'PutFooOperation', expected: 'WRITE'},
            { className: 'AWS-DynamoDB', operationName: 'UpdateFooOperation', expected: 'WRITE'},
            { className: 'AWS-DynamoDB', operationName: 'DescribeFooOperation', expected: 'READ'},
            { className: 'AWS-DynamoDB', operationName: 'ChangeFooOperation', expected: 'WRITE'},
            { className: 'AWS-DynamoDB', operationName: 'SendFooOperation', expected: 'WRITE'},
            { className: 'AWS-DynamoDB', operationName: 'FooOperationPermission', expected: 'PERMISSION'},
            { className: 'AWS-DynamoDB', operationName: 'FooOperationTagging', expected: 'TAGGING'},
            { className: 'AWS-DynamoDB', operationName: 'FooOperationTags', expected: 'TAGGING'},
            { className: 'AWS-DynamoDB', operationName: 'SetFooOperation', expected: 'WRITE'},
            // Nonmatching cases
            { className: 'AWS-DynamoDB', operationName: 'FooSetOperation', expected: ''},
            { className: 'AWS-DynamoDB', operationName: 'FooListOperation', expected: ''},
            { className: 'AWS-DynamoDB', operationName: 'FooSendOperation', expected: ''},
        ];

        for (const testCase of testCases) {
            expect(AWSIntegration.getOperationType(testCase.operationName, testCase.className)).toBe(testCase.expected);
        }
    });
});
