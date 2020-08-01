import AWS from './utils/aws.integration.utils';
import ThundraTracer from '../../dist/opentracing/Tracer';
import { AWSIntegration } from '../../dist/integrations/AWSIntegration';
import ExecutionContextManager from '../../dist/context/ExecutionContextManager';
import ExecutionContext from '../../dist/context/ExecutionContext';

const sdk = require('aws-sdk');

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

    test('should close span when worked with promise', () => {
        return AWS.s3_with_promise(sdk).then(() => {
            const span = tracer.getRecorder().spanList[0];
            expect(span.finishTime).toBeTruthy();
        });
    }, 30000);
});
