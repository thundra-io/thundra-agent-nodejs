import AMQPLIBIntegration from '../../dist/integrations/AmqplibIntegration';
import ThundraTracer from '../../dist/opentracing/Tracer';
import AMQP from './utils/amqplib.integration.utils';

import ExecutionContextManager from '../../dist/context/ExecutionContextManager';
import ExecutionContext from '../../dist/context/ExecutionContext';


describe('AMQP 0-9-1 integration', () => {
    let tracer;
    let integration;

    beforeAll(() => {
        tracer = new ThundraTracer();
        ExecutionContextManager.set(new ExecutionContext({ tracer }));
        integration = new AMQPLIBIntegration();
    });

    afterEach(() => {
        tracer.destroy();
    })

    test('should intrument AMQP with promise', () => {
        const sdk = require('amqplib');      
        
        return AMQP.promise_model(sdk).then((data) => {
            const span = tracer.getRecorder().spanList[0];

            expect(span.className).toBe('AMQP');
            expect(span.domainName).toBe('Messaging');
            console.log(data);
        });
    })

    test('should intrument AMQP with callback', () => {
        
        const sdk = require('amqplib/callback_api');

        return AMQP.callback_model(sdk).then((data) => {
            const span = tracer.getRecorder().spanList[0];

            expect(span.className).toBe('AMQP');
            expect(span.domainName).toBe('Messaging');
            console.log(data);

        })
    })
})