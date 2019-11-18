import AWS from './utils/aws.integration.utils';
import AWSIntegration from '../../dist/plugins/integrations/AWSIntegration';
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

        return AWS.s3_with_promise(sdk).then(() => {
            const span = tracer.getRecorder().spanList[0];
            expect(span.finishTime).toBeTruthy();
        });
    });
});
