import AWS from './utils/aws.integration.utils';
import AWSIntegration from '../../dist/plugins/integrations/AWSIntegration';
import ThundraTracer from '../../dist/opentracing/Tracer';
import InvocationSupport from '../../dist/plugins/support/InvocationSupport';
import TraceConfig from '../../dist/plugins/config/TraceConfig';

const md5 = require('md5');
jest.setTimeout(30000);

describe('AWS Integration', () => {
    InvocationSupport.setFunctionName('functionName');

    test('should instrument AWS DynamoDB calls ', () => { 
        const integration = new AWSIntegration({
            dynamoDBTraceInjectionEnabled: true,
        });
        const sdk = require('aws-sdk');

        const putParams = {
            Item: {'id': {S: '1'}},
            TableName: 'test-table',
        };

        const tracer = new ThundraTracer();
        
        return AWS.dynamo(sdk, putParams).then(() => {
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
            expect(span.tags['trigger.domainName']).toEqual('API');
            expect(span.tags['trigger.className']).toEqual('AWS-Lambda');
            expect(span.tags['trigger.operationNames']).toEqual(['functionName']);
            expect(span.tags['trace.links']).toEqual([`SAVE:${span.spanContext.spanId}`]);
            expect(span.finishTime).toBeTruthy();
        });
    });

    test('should mask AWS DynamoDB statements ', () => { 
        const integration = new AWSIntegration({
            disableInstrumentation: true,
            maskDynamoDBStatement: true,
            dynamoDBTraceInjectionEnabled: true,
        });

        const sdk = require('aws-sdk');

        const putParams = {
            Item: {'id': {S: '1'}},
            TableName: 'test-table',
        };
        
        const tracer = new ThundraTracer();
    
        return AWS.dynamo(sdk, putParams).then(() => {
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
            expect(span.tags['trigger.domainName']).toEqual('API');
            expect(span.tags['trigger.className']).toEqual('AWS-Lambda');
            expect(span.tags['trigger.operationNames']).toEqual(['functionName']);
            expect(span.tags['trace.links']).toEqual([`SAVE:${span.spanContext.spanId}`]);
            expect(span.finishTime).toBeTruthy();
        });
    });

    test('should instrument AWS S3 GetObject call ', () => { 
        const integration = new AWSIntegration({});
        const sdk = require('aws-sdk');
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
        integration.wrappedFuncs.send = mockSend;

        const tracer = new ThundraTracer();

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
            expect(span.tags['trigger.domainName']).toEqual('API');
            expect(span.tags['trigger.className']).toEqual('AWS-Lambda');
            expect(span.tags['trigger.operationNames']).toEqual(['functionName']);
            expect(span.tags['trace.links']).toEqual(['EXAMPLE_REQUEST_ID_123']);
            expect(span.finishTime).toBeTruthy();
        });
    });

    test('should instrument AWS S3 ListBucket call ', () => { 
        const integration = new AWSIntegration({});
        const sdk = require('aws-sdk');

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
        integration.wrappedFuncs.send = mockSend;
        
        const tracer = new ThundraTracer();

        return AWS.s3ListBuckets(sdk).then(() => {
            const span = tracer.getRecorder().spanList[0];

            expect(span.operationName).toBe('AWSServiceRequest');

            expect(span.className).toBe('AWS-S3');
            expect(span.domainName).toBe('Storage');

            expect(span.tags['operation.type']).toBe('READ');
            expect(span.tags['aws.s3.bucket.name']).not.toBeTruthy();
            expect(span.tags['aws.request.name']).toBe('listBuckets');
            expect(span.tags['aws.s3.object.name']).not.toBeTruthy();
            expect(span.tags['topology.vertex']).toEqual(true);
            expect(span.tags['trigger.domainName']).toEqual('API');
            expect(span.tags['trigger.className']).toEqual('AWS-Lambda');
            expect(span.tags['trigger.operationNames']).toEqual(['functionName']);
            expect(span.tags['trace.links']).toEqual(['EXAMPLE_REQUEST_ID_123']);
            expect(span.finishTime).toBeTruthy();
        });
    });

    test('should instrument AWS Lambda invoke call ', () => { 
        const integration = new AWSIntegration({});
        const sdk = require('aws-sdk');

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
        integration.wrappedFuncs.send = mockSend;
        
        const tracer = new ThundraTracer();

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
            expect(span.tags['trigger.domainName']).toEqual('API');
            expect(span.tags['trigger.className']).toEqual('AWS-Lambda');
            expect(span.tags['trigger.operationNames']).toEqual(['functionName']);
            expect(span.tags['trace.links']).toEqual(['EXAMPLE_REQUEST_ID_123']);
            expect(span.finishTime).toBeTruthy();
        });
    });

    test('should mask AWS Lambda Payload', () => { 
        const integration = new AWSIntegration({
            maskLambdaPayload: true
        });
        const sdk = require('aws-sdk');

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
        integration.wrappedFuncs.send = mockSend;
        
        const tracer = new ThundraTracer();

        return AWS.lambda(sdk).then(() => {
            const span = tracer.getRecorder().spanList[0];

            expect(span.operationName).toBe('Test');

            expect(span.className).toBe('AWS-Lambda');
            expect(span.domainName).toBe('API');

            expect(span.tags['aws.lambda.invocation.payload']).not.toBeTruthy();
        });
    });

    test('should instrument AWS Lambda calls ', () => { 
        const integration = new AWSIntegration({});
        const sdk = require('aws-sdk');

        const tracer = new ThundraTracer();

        return AWS.lambdaGetAccountSettings(sdk).then(() => {
            expect(tracer.getRecorder().spanList[0]).toBeTruthy();
        });
    });
    
    test('should instrument AWS SQS calls ', () => { 
        const integration = new AWSIntegration({});
        const sdk = require('aws-sdk');

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
        integration.wrappedFuncs.send = mockSend;
        
        const tracer = new ThundraTracer();

        return AWS.sqs(sdk).then(() => {
            const span = tracer.getRecorder().spanList[0];

            expect(span.operationName).toBe('testqueue');

            expect(span.className).toBe('AWS-SQS');
            expect(span.domainName).toBe('Messaging');

            expect(span.tags['aws.sqs.message']).toBe('Hello Thundra!');
            expect(span.tags['aws.request.name']).toBe('sendMessage');
            expect(span.tags['aws.sqs.queue.name']).toBe('testqueue');
            expect(span.tags['operation.type']).toBe('WRITE');
            expect(span.tags['topology.vertex']).toEqual(true);
            expect(span.tags['trigger.domainName']).toEqual('API');
            expect(span.tags['trigger.className']).toEqual('AWS-Lambda');
            expect(span.tags['trigger.operationNames']).toEqual(['functionName']);
            expect(span.tags['trace.links']).toEqual(['EXAMPLE_MESSAGE_ID_123']);
            expect(span.finishTime).toBeTruthy();
        });
    });

    test('should mask AWS SQS message ', () => { 
        const integration = new AWSIntegration({
            maskSQSMessage: true
        });
        const sdk = require('aws-sdk');

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

        integration.wrappedFuncs.send = mockSend;
        const tracer = new ThundraTracer();

        return AWS.sqs(sdk).then(() => {
            const span = tracer.getRecorder().spanList[0];

            expect(span.operationName).toBe('testqueue');

            expect(span.className).toBe('AWS-SQS');
            expect(span.domainName).toBe('Messaging');

            expect(span.tags['aws.sqs.message']).not.toBeTruthy();
        });
    });

    test('should instrument AWS sqs_list_queue calls', () => { 
        const integration = new AWSIntegration({});
        const sdk = require('aws-sdk');

        const tracer = new ThundraTracer();

        return AWS.sqs_list_queue(sdk).then(() => {
            const span = tracer.getRecorder().spanList[0];
            
            expect(span.operationName).toBe('AWSServiceRequest');

            expect(span.className).toBe('AWS-SQS');
            expect(span.domainName).toBe('Messaging');

            expect(span.tags['aws.request.name']).toBe('listQueues');
            expect(span.tags['aws.sqs.queue.name']).not.toBeTruthy();
            expect(span.tags['operation.type']).toBe('');
            expect(span.tags['topology.vertex']).not.toBeTruthy();
            expect(span.tags['trigger.domainName']).not.toBeTruthy();
            expect(span.tags['trigger.className']).not.toBeTruthy();
            expect(span.tags['trigger.operationNames']).not.toBeTruthy();
            expect(span.finishTime).toBeTruthy();
        });
    });
  
    
    test('should instrument AWS SNS publish to topic calls ', () => {
        const integration = new AWSIntegration({});
        const sdk = require('aws-sdk');

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
        integration.wrappedFuncs.send = mockSend;
        
        const tracer = new ThundraTracer();

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
            expect(span.tags['trigger.domainName']).toEqual('API');
            expect(span.tags['trigger.className']).toEqual('AWS-Lambda');
            expect(span.tags['trigger.operationNames']).toEqual(['functionName']);
            expect(span.tags['trace.links']).toEqual(['EXAMPLE_MESSAGE_ID_123']);
            expect(span.finishTime).toBeTruthy();
        });
    });

    test('should instrument AWS SNS publish to target calls ', () => {
        const integration = new AWSIntegration({});
        const sdk = require('aws-sdk');

        integration.wrap(sdk, {});

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
        integration.wrappedFuncs.send = mockSend;

        const tracer = new ThundraTracer();

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
            expect(span.tags['trigger.domainName']).toEqual('API');
            expect(span.tags['trigger.className']).toEqual('AWS-Lambda');
            expect(span.tags['trigger.operationNames']).toEqual(['functionName']);
            expect(span.tags['trace.links']).toEqual(['EXAMPLE_MESSAGE_ID_123']);
            expect(span.finishTime).toBeTruthy();
        });
    });

    test('should instrument AWS SNS publish to SMS calls ', () => {
        const integration = new AWSIntegration({});
        const sdk = require('aws-sdk');

        integration.wrap(sdk, {});

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
        integration.wrappedFuncs.send = mockSend;

        const tracer = new ThundraTracer();

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
            expect(span.tags['trigger.domainName']).toEqual('API');
            expect(span.tags['trigger.className']).toEqual('AWS-Lambda');
            expect(span.tags['trigger.operationNames']).toEqual(['functionName']);
            expect(span.tags['trace.links']).toEqual(['EXAMPLE_MESSAGE_ID_123']);
            expect(span.finishTime).toBeTruthy();
        });
    });

    test('should instrument AWS SNS call without publish', () => { 
        const integration = new AWSIntegration({});
        const sdk = require('aws-sdk');

        const tracer = new ThundraTracer();

        return AWS.sns_checkIfPhoneNumberIsOptedOut(sdk).then(() => {
            const span = tracer.getRecorder().spanList[0];

            expect(span.operationName).toBe('AWSServiceRequest');

            expect(span.className).toBe('AWS-SNS');
            expect(span.domainName).toBe('Messaging');

            expect(span.tags['aws.request.name']).toBe('checkIfPhoneNumberIsOptedOut');
            expect(span.tags['aws.sns.topic.name']).toBe(undefined);
            expect(span.tags['operation.type']).toBe('');
            expect(span.finishTime).toBeTruthy();
        });
    });
    
    test('should mask SNS Message', () => { 
        const integration = new AWSIntegration({
            maskSNSMessage: true
        });
        const sdk = require('aws-sdk');

        const tracer = new ThundraTracer();

        return AWS.sns_checkIfPhoneNumberIsOptedOut(sdk).then(() => {
            const span = tracer.getRecorder().spanList[0];

            expect(span.operationName).toBe('AWSServiceRequest');

            expect(span.className).toBe('AWS-SNS');
            expect(span.domainName).toBe('Messaging');

            expect(span.tags['aws.sns.message']).not.toBeTruthy();
        });
    }); 
    
    test('should instrument AWS Kinesis calls ', () => { 
        const integration = new AWSIntegration({});
        const sdk = require('aws-sdk');

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
        integration.wrappedFuncs.send = mockSend;
        
        const tracer = new ThundraTracer();

        return AWS.kinesis(sdk).then(() => {
            const span = tracer.getRecorder().spanList[0];
            expect(span.operationName).toBe('STRING_VALUE');

            expect(span.className).toBe('AWS-Kinesis');
            expect(span.domainName).toBe('Stream');

            expect(span.tags['aws.request.name']).toBe('putRecord');
            expect(span.tags['aws.kinesis.stream.name']).toBe('STRING_VALUE');
            expect(span.tags['operation.type']).toBe('WRITE');
            expect(span.tags['topology.vertex']).toEqual(true);
            expect(span.tags['trigger.domainName']).toEqual('API');
            expect(span.tags['trigger.className']).toEqual('AWS-Lambda');
            expect(span.tags['trigger.operationNames']).toEqual(['functionName']);
            expect(span.tags['trace.links']).toEqual(['us-west-2:STRING_VALUE:SHARD_ID_1:SEQUENCE_NUMBER_1',
                'us-west-2:STRING_VALUE:SHARD_ID_2:SEQUENCE_NUMBER_2']);
            expect(span.finishTime).toBeTruthy();
        });
    });

    test('should instrument AWS Firehose calls ', () => { 
        const integration = new AWSIntegration({});
        const sdk = require('aws-sdk');

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
        integration.wrappedFuncs.send = mockSend;

        const dataHash = md5('STRING_VALUE');
        const traceLinks = [0, 1, 2].map((i) => `us-west-2:STRING_VALUE:${timestamp + i}:${dataHash}`);
        const tracer = new ThundraTracer();

        return AWS.firehose(sdk).then(() => {
            const span = tracer.getRecorder().spanList[0];
            expect(span.operationName).toBe('STRING_VALUE');

            expect(span.className).toBe('AWS-Firehose');
            expect(span.domainName).toBe('Stream');

            expect(span.tags['aws.request.name']).toBe('putRecord');
            expect(span.tags['aws.firehose.stream.name']).toBe('STRING_VALUE');
            expect(span.tags['operation.type']).toBe('WRITE');
            expect(span.tags['topology.vertex']).toEqual(true);
            expect(span.tags['trigger.domainName']).toEqual('API');
            expect(span.tags['trigger.className']).toEqual('AWS-Lambda');
            expect(span.tags['trigger.operationNames']).toEqual(['functionName']);
            expect(span.tags['trace.links']).toEqual(traceLinks);
            expect(span.finishTime).toBeTruthy();
        });
    });

    test('should instrument AWS Athena calls ', () => { 
        const integration = new AWSIntegration({});
        const sdk = require('aws-sdk');
        const tracer = new ThundraTracer();

        return AWS.athenaStartQueryExec(sdk).then(() => {
            const span = tracer.getRecorder().spanList[0];
            expect(span.operationName).toBe('sample-db');

            expect(span.className).toBe('AWS-Athena');
            expect(span.domainName).toBe('DB');

            expect(span.tags['aws.request.name']).toBe('startQueryExecution');
            expect(span.tags['operation.type']).toBe('EXECUTE');
            expect(span.tags['db.instance']).toBe('sample-db');
            expect(span.tags['db.statement']).toBe('sample-query');
            expect(span.tags['aws.athena.s3.outputLocation']).toBe('sample-output-location');
            expect(span.tags['aws.athena.request.query.executionIds']).toBeUndefined();
            expect(span.tags['aws.athena.request.namedQuery.ids']).toBeUndefined();
            expect(span.tags['topology.vertex']).toEqual(true);
            expect(span.tags['trigger.domainName']).toEqual('API');
            expect(span.tags['trigger.className']).toEqual('AWS-Lambda');
            expect(span.tags['trigger.operationNames']).toEqual(['functionName']);
            expect(span.finishTime).toBeTruthy();
        });
    });

    test('should instrument AWS Athena statement masked ', () => { 
        const integration = new AWSIntegration({
            maskAthenaStatement: true,
        });
        const sdk = require('aws-sdk');
        const tracer = new ThundraTracer();

        return AWS.athenaStartQueryExec(sdk).then(() => {
            const span = tracer.getRecorder().spanList[0];
            expect(span.operationName).toBe('sample-db');

            expect(span.className).toBe('AWS-Athena');
            expect(span.domainName).toBe('DB');

            expect(span.tags['aws.request.name']).toBe('startQueryExecution');
            expect(span.tags['operation.type']).toBe('EXECUTE');
            expect(span.tags['db.instance']).toBe('sample-db');
            expect(span.tags['db.statement']).toBeUndefined();
            expect(span.tags['aws.athena.s3.outputLocation']).toBe('sample-output-location');
            expect(span.tags['aws.athena.request.query.executionIds']).toBeUndefined();
            expect(span.tags['aws.athena.request.namedQuery.ids']).toBeUndefined();
            expect(span.tags['topology.vertex']).toEqual(true);
            expect(span.tags['trigger.domainName']).toEqual('API');
            expect(span.tags['trigger.className']).toEqual('AWS-Lambda');
            expect(span.tags['trigger.operationNames']).toEqual(['functionName']);
            expect(span.finishTime).toBeTruthy();
        });
    });

    test('should instrument AWS Athena stop query execution ', () => { 
        const integration = new AWSIntegration({});
        const sdk = require('aws-sdk');
        const tracer = new ThundraTracer();

        return AWS.athenaStopQueryExec(sdk).then(() => {
            const span = tracer.getRecorder().spanList[0];
            expect(span.operationName).toBe('AWSServiceRequest');

            expect(span.className).toBe('AWS-Athena');
            expect(span.domainName).toBe('DB');

            expect(span.tags['aws.request.name']).toBe('stopQueryExecution');
            expect(span.tags['operation.type']).toBe('EXECUTE');
            expect(span.tags['db.instance']).toBeUndefined();
            expect(span.tags['db.statement']).toBeUndefined();
            expect(span.tags['aws.athena.s3.outputLocation']).toBeUndefined();
            expect(span.tags['aws.athena.request.query.executionIds']).toEqual(['sample-query-execution-id']);
            expect(span.tags['aws.athena.request.namedQuery.ids']).toBeUndefined();
            expect(span.tags['topology.vertex']).toEqual(true);
            expect(span.tags['trigger.domainName']).toEqual('API');
            expect(span.tags['trigger.className']).toEqual('AWS-Lambda');
            expect(span.tags['trigger.operationNames']).toEqual(['functionName']);
            expect(span.finishTime).toBeTruthy();
        });
    });

    test('should instrument AWS Athena batch get named query ', () => { 
        const integration = new AWSIntegration({});
        const sdk = require('aws-sdk');
        const tracer = new ThundraTracer();

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
            expect(span.tags['trigger.domainName']).toEqual('API');
            expect(span.tags['trigger.className']).toEqual('AWS-Lambda');
            expect(span.tags['trigger.operationNames']).toEqual(['functionName']);
            expect(span.finishTime).toBeTruthy();
        });
    });

    test('should instrument AWS Athena batch get query execution ', () => { 
        const integration = new AWSIntegration({});
        const sdk = require('aws-sdk');
        const tracer = new ThundraTracer();

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
            expect(span.tags['trigger.domainName']).toEqual('API');
            expect(span.tags['trigger.className']).toEqual('AWS-Lambda');
            expect(span.tags['trigger.operationNames']).toEqual(['functionName']);
            expect(span.finishTime).toBeTruthy();
        });
    });

    test('should instrument AWS Athena create named query ', () => { 
        const integration = new AWSIntegration({});
        const sdk = require('aws-sdk');
        const tracer = new ThundraTracer();
        const mockSend = jest.fn((cb) => {
            let req = mockSend.mock.instances[0];
            req.response = {
                data: {
                    NamedQueryId: 'sample-named-query-id',
                },
            };
            cb(null, {result: 'success'});
        });
        integration.wrappedFuncs.send = mockSend;

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
            expect(span.tags['trigger.domainName']).toEqual('API');
            expect(span.tags['trigger.className']).toEqual('AWS-Lambda');
            expect(span.tags['trigger.operationNames']).toEqual(['functionName']);
            expect(span.finishTime).toBeTruthy();
        });
    });
    
    test('should instrument AWS KMS calls ', () => { 
        const integration = new AWSIntegration({});
        const sdk = require('aws-sdk');

        const tracer = new ThundraTracer();

        return AWS.kms(sdk).then(() => {
            const span = tracer.getRecorder().spanList[0];
            expect(span.operationName).toBe('AWSServiceRequest');

            expect(span.className).toBe('AWSService');
            expect(span.domainName).toBe('AWS');

            expect(span.tags['aws.request.name']).toBe('createKey');
            expect(span.finishTime).toBeTruthy();
        });
    });
});
