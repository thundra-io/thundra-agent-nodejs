import AWS from './utils/aws.integration.utils';
import { AWSv3Integration } from '../../dist/integrations/AWSv3Integration';
import ThundraTracer from '../../dist/opentracing/Tracer';
import ExecutionContextManager from '../../dist/context/ExecutionContextManager';
import ExecutionContext from '../../dist/context/ExecutionContext';
import * as AWS_SQS from '@aws-sdk/client-sqs';

beforeAll(() => {
    AWSv3Integration.prototype.getOriginalFunction = jest.fn(() => {
        return (cb) => {
            cb(null, { result: 'OK' });
        };
    });
});

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

        const client = new AWS_SQS.SQS({ region: 'us-west-2' });

        const result = await client.sendMessage({
            QueueUrl: 'test',
            MessageBody: 'hello',
        });
        console.log(result);
    });

});
