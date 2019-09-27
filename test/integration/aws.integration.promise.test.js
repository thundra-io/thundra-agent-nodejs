import AWS from './utils/aws.integration.utils';
import {AWSIntegration} from '../../dist/plugins/integrations/AWSIntegration';
import ThundraTracer from '../../dist/opentracing/Tracer';
import InvocationSupport from '../../dist/plugins/support/InvocationSupport';

describe('AWS Integration', () => {
    InvocationSupport.setFunctionName('functionName');

    test('should close span when worked with promise', () => { 
        const tracer = new ThundraTracer();
        const integration = new AWSIntegration({
            tracer,
        });
        const sdk = require('aws-sdk');

        integration.wrap(sdk, {});
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
        

        return AWS.s3_with_promise(sdk).then(() => {
            const span = tracer.getRecorder().spanList[0];
            expect(span.finishTime).toBeTruthy();
        });
    });
});
