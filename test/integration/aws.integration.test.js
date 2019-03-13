import AWS from './utils/aws.integration.utils';
import AWSIntegration from '../../dist/plugins/integrations/AWSIntegration';
import ThundraTracer from '../../dist/opentracing/Tracer';
import InvocationSupport from '../../dist/plugins/support/InvocationSupport';
import TraceConfig from '../../dist/plugins/config/TraceConfig';

describe('AWS Integration', () => {
    InvocationSupport.setFunctionName('functionName');

    test('should instrument AWS DynamoDB calls ', () => { 
        const integration = new AWSIntegration({});
        const sdk = require('aws-sdk');

        integration.wrap(sdk, {});
        
        const tracer = new ThundraTracer();
        
        return AWS.dynamo(sdk).then(() => {
            const span = tracer.getRecorder().spanList[0];
            
            expect(span.operationName).toBe('test-table');

            expect(span.className).toBe('AWS-DynamoDB');
            expect(span.domainName).toBe('DB');

            expect(span.tags['db.type']).toBe('aws-dynamodb');
            expect(span.tags['db.instance']).toBe('dynamodb.us-west-2.amazonaws.com');
            expect(span.tags['db.statement.type']).toBe('READ');
            expect(span.tags['aws.dynamodb.table.name']).toBe('test-table');
            expect(span.tags['operation.type']).toBe('READ');
            expect(span.tags['aws.request.name']).toBe('getItem');
            expect(span.tags['db.statement']).toEqual({ TableName: 'test-table', Key: {id:{S:'1'}}});
            expect(span.tags['topology.vertex']).toEqual(true);
            expect(span.tags['trigger.domainName']).toEqual('API');
            expect(span.tags['trigger.className']).toEqual('AWS-Lambda');
            expect(span.tags['trigger.operationNames']).toEqual(['functionName']);
        });
    });

    test('should mask AWS DynamoDB statements ', () => { 
        const integration = new AWSIntegration({});
        const sdk = require('aws-sdk');

        const traceConfig = new TraceConfig({
            disableInstrumentation: true,
            maskDynamoDBStatement: true
        });

        integration.wrap(sdk, traceConfig);
        
        const tracer = new ThundraTracer();
    
        return AWS.dynamo(sdk).then(() => {
            const span = tracer.getRecorder().spanList[0];
            
            expect(span.tags['db.statement']).not.toBeTruthy();

            expect(span.operationName).toBe('test-table');
            expect(span.className).toBe('AWS-DynamoDB');
            expect(span.domainName).toBe('DB');
            expect(span.tags['db.type']).toBe('aws-dynamodb');
            expect(span.tags['db.instance']).toBe('dynamodb.us-west-2.amazonaws.com');
            expect(span.tags['db.statement.type']).toBe('READ');
            expect(span.tags['aws.dynamodb.table.name']).toBe('test-table');
            expect(span.tags['operation.type']).toBe('READ');
            expect(span.tags['aws.request.name']).toBe('getItem');
            expect(span.tags['topology.vertex']).toEqual(true);
            expect(span.tags['trigger.domainName']).toEqual('API');
            expect(span.tags['trigger.className']).toEqual('AWS-Lambda');
            expect(span.tags['trigger.operationNames']).toEqual(['functionName']);
        });
    });

    test('should instrument AWS S3 GetObject call ', () => { 
        const integration = new AWSIntegration({});
        const sdk = require('aws-sdk');

        integration.wrap(sdk, {});
        
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
        });
    });

    test('should instrument AWS S3 ListBucket call ', () => { 
        const integration = new AWSIntegration({});
        const sdk = require('aws-sdk');

        integration.wrap(sdk, {});
        
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
        });
    });

    test('should instrument AWS Lambda invoke call ', () => { 
        const integration = new AWSIntegration({});
        const sdk = require('aws-sdk');

        integration.wrap(sdk, {});
        
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
        });
    });

    test('should instrument AWS Lambda calls ', () => { 
        const integration = new AWSIntegration({});
        const sdk = require('aws-sdk');

        integration.wrap(sdk, {});
        
        const tracer = new ThundraTracer();

        return AWS.lambdaGetAccountSettings(sdk).then(() => {
            expect(tracer.getRecorder().spanList[0]).toBeTruthy();
        });
    });
    
    test('should instrument AWS SQS calls ', () => { 
        const integration = new AWSIntegration({});
        const sdk = require('aws-sdk');

        integration.wrap(sdk, {});
        
        const tracer = new ThundraTracer();

        return AWS.sqs(sdk).then(() => {
            const span = tracer.getRecorder().spanList[0];

            expect(span.operationName).toBe('testqueue');

            expect(span.className).toBe('AWS-SQS');
            expect(span.domainName).toBe('Messaging');

            expect(span.tags['aws.request.name']).toBe('sendMessage');
            expect(span.tags['aws.sqs.queue.name']).toBe('testqueue');
            expect(span.tags['operation.type']).toBe('WRITE');
            expect(span.tags['topology.vertex']).toEqual(true);
            expect(span.tags['trigger.domainName']).toEqual('API');
            expect(span.tags['trigger.className']).toEqual('AWS-Lambda');
            expect(span.tags['trigger.operationNames']).toEqual(['functionName']);
        });
    });

    test('should instrument AWS sqs_list_queue calls', () => { 
        const integration = new AWSIntegration({});
        const sdk = require('aws-sdk');

        integration.wrap(sdk, {});
        
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
        });
    });
  
    
    test('should instrument AWS SNS publish calls ', () => { 
        const integration = new AWSIntegration({});
        const sdk = require('aws-sdk');

        integration.wrap(sdk, {});
        
        const tracer = new ThundraTracer();

        return AWS.sns(sdk).then(() => {
            const span = tracer.getRecorder().spanList[0];

            expect(span.operationName).toBe('TEST_TOPIC');

            expect(span.className).toBe('AWS-SNS');
            expect(span.domainName).toBe('Messaging');

            expect(span.tags['aws.request.name']).toBe('publish');
            expect(span.tags['aws.sns.topic.name']).toBe('TEST_TOPIC');
            expect(span.tags['operation.type']).toBe('WRITE');
            expect(span.tags['topology.vertex']).toEqual(true);
            expect(span.tags['trigger.domainName']).toEqual('API');
            expect(span.tags['trigger.className']).toEqual('AWS-Lambda');
            expect(span.tags['trigger.operationNames']).toEqual(['functionName']);
        });
    }); 


    test('should instrument AWS SNS  call without publish', () => { 
        const integration = new AWSIntegration({});
        const sdk = require('aws-sdk');

        integration.wrap(sdk, {});
        
        const tracer = new ThundraTracer();

        return AWS.sns_checkIfPhoneNumberIsOptedOut(sdk).then(() => {
            const span = tracer.getRecorder().spanList[0];

            expect(span.operationName).toBe('AWSServiceRequest');

            expect(span.className).toBe('AWS-SNS');
            expect(span.domainName).toBe('Messaging');

            expect(span.tags['aws.request.name']).toBe('checkIfPhoneNumberIsOptedOut');
            expect(span.tags['aws.sns.topic.name']).toBe(undefined);
            expect(span.tags['operation.type']).toBe('');
        });
    }); 
    
    test('should instrument AWS Kinesis calls ', () => { 
        const integration = new AWSIntegration({});
        const sdk = require('aws-sdk');

        integration.wrap(sdk, {});
        
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
        });
    });

    test('should instrument AWS Firehose calls ', () => { 
        const integration = new AWSIntegration({});
        const sdk = require('aws-sdk');

        integration.wrap(sdk, {});
        
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
        });
    });

    test('should instrument AWS KMS calls ', () => { 
        const integration = new AWSIntegration({});
        const sdk = require('aws-sdk');

        integration.wrap(sdk, {});
        
        const tracer = new ThundraTracer();

        return AWS.kms(sdk).then(() => {
            const span = tracer.getRecorder().spanList[0];
            expect(span.operationName).toBe('AWSServiceRequest');

            expect(span.className).toBe('AWSService');
            expect(span.domainName).toBe('AWS');

            expect(span.tags['aws.request.name']).toBe('createKey');
        });
    });
});
