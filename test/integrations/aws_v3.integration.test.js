import AWS from './utils/aws.integration.utils';
import { AWSv3Integration } from '../../dist/integrations/AWSv3Integration';
import ThundraTracer from '../../dist/opentracing/Tracer';
import ExecutionContextManager from '../../dist/context/ExecutionContextManager';
import ExecutionContext from '../../dist/context/ExecutionContext';
import * as AWS_SQS from '@aws-sdk/client-sqs';

import * as AWS_DYNAMODB from '@aws-sdk/client-dynamodb';

beforeAll(() => {
    AWSv3Integration.prototype.getOriginalFunction = jest.fn(() => {
        return (cb) => {
            cb(null, { result: 'OK' });
        };
    });
});

jest.setTimeout(6000000);

describe('AWS integration', () => {
    let tracer;
    let integration;

    beforeAll(() => {
        tracer = new ThundraTracer();
        ExecutionContextManager.set(new ExecutionContext({ tracer }));
        integration = new AWSv3Integration();
    });

    afterEach(() => {
        tracer.destroy();
    });

    test('should instrument AWS SQS calls ', async () => {
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

        const client = new AWS_SQS.SQS({ region: 'eu-west-1' });

        const input = {
            MessageBody: 'Hello Thundra!',
            QueueUrl: 'https://sqs.eu-west-1.amazonaws.com/058791174461/tryer-queue',
            DelaySeconds: 0
        };

        const command = new AWS_SQS.SendMessageCommand(input);

        const result = await client.send(command);

        // const result = await client.sendMessage({
        //     MessageBody: 'Hello Thundra!',
        //     QueueUrl: 'https://sqs.us-east-2.amazonaws.com/123456789012/MyQueue',
        //     DelaySeconds: 0
        // });
        
        console.log(result);
    });

    test('should instrument AWS Dynamodb calls ', async () => {
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

        const dynamoClient = new AWS_DYNAMODB.DynamoDBClient({ region: 'eu-west-1' });

        // dynamoClient.middlewareStack.add(async (next, context) => {

        //     return async (args) => {
        //         const result = await next(args);
        //         return result;
        //     }
        // }, {
        //     step: 'deserialize',
        //     name: 'abc',
        //     tags: []
        // });

        const { v4: uuidv4 } = require('uuid'); 

        const input = {
            TableName: 'bthn-table',
            Item: {
                id: {
                    S: `${new uuidv4()}`
                }
            }
        }
        
        const command = new AWS_DYNAMODB.PutItemCommand(input);
    
        const result = await dynamoClient.send(command);
        
        console.log(result);
    });

});
