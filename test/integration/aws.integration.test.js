import AWS from './utils/aws.integration.utils';
import AWSIntegration from '../../dist/plugins/integrations/AWSIntegration';
import ThundraTracer from '../../dist/opentracing/Tracer';

describe('AWS Integration', () => {
    
    test('should instrument AWS DynamoDB calls ', () => { 
        const integration = new AWSIntegration({});
        const sdk = require('aws-sdk');

        integration.wrap(sdk, {});
        
        const tracer = new ThundraTracer();

        return AWS.dynamo(sdk).then(() => {
            const span = tracer.getRecorder().spanList[0];
            expect(span.className).toBe('AWS-DynamoDB');
            expect(span.domainName).toBe('DB');
            expect(span.tags['db.type']).toBe('aws-dynamodb');
            expect(span.tags['db.instance']).toBe('dynamodb.us-west-2.amazonaws.com');
            expect(span.tags['db.statement.type']).toBe('READ');
            expect(span.tags['aws.dynamodb.table.name']).toBe('test-table');
            expect(span.tags['operation.type']).toBe('READ');
            expect(span.tags['aws.request.name']).toBe('getItem');
            expect(span.tags['db.statement']).toEqual({ TableName: 'test-table', Key: {id:{S:'1'}}});
        });
    });

    test('should instrument AWS S3 calls ', () => { 
        const integration = new AWSIntegration({});
        const sdk = require('aws-sdk');

        integration.wrap(sdk, {});
        
        const tracer = new ThundraTracer();

        return AWS.s3(sdk).then(() => {
            const span = tracer.getRecorder().spanList[0];
            expect(span.className).toBe('AWS-S3');
            expect(span.domainName).toBe('Storage');
            expect(span.tags['operation.type']).toBe('READ');
            expect(span.tags['aws.s3.bucket.name']).toBe('test');
            expect(span.tags['aws.request.name']).toBe('getObject');
            expect(span.tags['aws.s3.object.name']).toBe('test.txt');
        });
    });

    test('should instrument AWS Lambda calls ', () => { 
        const integration = new AWSIntegration({});
        const sdk = require('aws-sdk');

        integration.wrap(sdk, {});
        
        const tracer = new ThundraTracer();

        return AWS.lambda(sdk).then(() => {
            const span = tracer.getRecorder().spanList[0];
            expect(span.className).toBe('AWS-Lambda');
            expect(span.domainName).toBe('API');
            expect(span.tags['aws.lambda.name']).toBe('Test');
            expect(span.tags['aws.lambda.qualifier']).toBe(undefined);
            expect(span.tags['aws.lambda.invocation.payload']).toEqual('{ "name" : "thundra" }');
            expect(span.tags['aws.request.name']).toBe('invoke');
            expect(span.tags['aws.lambda.invocation.type']).toBe('RequestResponse');
        });
    });
    
    test('should instrument AWS SQS calls ', () => { 
        const integration = new AWSIntegration({});
        const sdk = require('aws-sdk');

        integration.wrap(sdk, {});
        
        const tracer = new ThundraTracer();

        return AWS.sqs(sdk).then(() => {
            const span = tracer.getRecorder().spanList[0];
            expect(span.className).toBe('AWS-SQS');
            expect(span.domainName).toBe('Messaging');
            expect(span.tags['aws.request.name']).toBe('sendMessage');
            expect(span.tags['aws.sqs.queue.name']).toBe('testqueue');
            expect(span.tags['operation.type']).toBe('WRITE');
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
            expect(span.tags['aws.sqs.queue.name']).toBe('AWSServiceRequest');
            expect(span.tags['operation.type']).toBe('READ');
        });
    });
  
    
    test('should instrument AWS SNS calls ', () => { 
        const integration = new AWSIntegration({});
        const sdk = require('aws-sdk');

        integration.wrap(sdk, {});
        
        const tracer = new ThundraTracer();
        return AWS.sns(sdk).then(() => {
            const span = tracer.getRecorder().spanList[0];
            expect(span.className).toBe('AWS-SNS');
            expect(span.domainName).toBe('Messaging');
            expect(span.tags['aws.request.name']).toBe('publish');
            expect(span.tags['aws.sns.topic.name']).toBe('TEST_TOPIC');
            expect(span.tags['operation.type']).toBe('WRITE');
        });
    }); 
    
    test('should instrument AWS Kinesis calls ', () => { 
        const integration = new AWSIntegration({});
        const sdk = require('aws-sdk');

        integration.wrap(sdk, {});
        
        const tracer = new ThundraTracer();

        return AWS.kinesis(sdk).then(() => {
            const span = tracer.getRecorder().spanList[0];
            expect(span.className).toBe('AWS-Kinesis');
            expect(span.domainName).toBe('Stream');
            expect(span.tags['aws.request.name']).toBe('putRecord');
            expect(span.tags['aws.kinesis.stream.name']).toBe('STRING_VALUE');
            expect(span.tags['operation.type']).toBe('WRITE');
        });
    });

    test('should instrument AWS Firehose calls ', () => { 
        const integration = new AWSIntegration({});
        const sdk = require('aws-sdk');

        integration.wrap(sdk, {});
        
        const tracer = new ThundraTracer();

        return AWS.firehose(sdk).then(() => {
            const span = tracer.getRecorder().spanList[0];
            expect(span.className).toBe('AWS-Firehose');
            expect(span.domainName).toBe('Stream');
            expect(span.tags['aws.request.name']).toBe('putRecord');
            expect(span.tags['aws.firehose.stream.name']).toBe('STRING_VALUE');
            expect(span.tags['operation.type']).toBe('WRITE');
        });
    });
});