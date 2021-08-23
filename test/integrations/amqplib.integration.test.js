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
    });

    test('should intrument AMQP with promise', () => {
        const sdk = require('amqplib');      
        
        return AMQP.promise_model(sdk).then((data) => {
            const span_send = tracer.getRecorder().spanList[0];
            const span_dispatch = tracer.getRecorder().spanList[1];
            
            expect(span_send.className).toBe('AMQP');
            expect(span_send.domainName).toBe('Messaging');
            expect(span_send.operationName).toBe('tasks_promise');
            expect(span_send.spanContext.traceId).not.toBeUndefined();
            expect(span_send.spanContext.spanId).not.toBeUndefined();
            expect(span_send.tags['amqp.exchange']).toBe('');
            expect(span_send.tags['amqp.host']).toBe('localhost');
            expect(span_send.tags['amqp.port']).toBe(5672);
            expect(span_send.tags['amqp.routingKey']).toBe('tasks_promise');
            expect(span_send.tags['amqp.method']).toBe('basic.publish');
            expect(span_send.tags['operation.type']).toBe('publish');
            expect(span_send.tags['service.name']).toBe('amqp-default-service');
            expect(span_send.tags['span.type']).toBe('Amqplib');
            


            expect(span_dispatch.className).toBe('AMQP');
            expect(span_dispatch.domainName).toBe('Messaging');
            expect(span_dispatch.operationName).toBe('tasks_promise');
            expect(span_dispatch.spanContext.traceId).not.toBeUndefined();
            expect(span_dispatch.spanContext.spanId).not.toBeUndefined();
            expect(span_dispatch.tags['amqp.exchange']).toBe('');
            expect(span_dispatch.tags['amqp.message']).toBe('amqplib promise');
            expect(span_dispatch.tags['amqp.host']).toBe('localhost');
            expect(span_dispatch.tags['amqp.port']).toBe(5672);
            expect(span_dispatch.tags['amqp.routingKey']).toBe('tasks_promise');
            expect(span_dispatch.tags['operation.type']).toBe('deliver');
            expect(span_dispatch.tags['service.name']).toBe('amqp-default-service');
            expect(span_dispatch.tags['span.type']).toBe('Amqplib');
            expect(span_dispatch.tags['amqp.consumerTag']).not.toBeUndefined();
        });
    });

    test('should intrument AMQP with callback', () => {
        
        const sdk = require('amqplib/callback_api');

        return AMQP.callback_model(sdk).then((data) => {
            const span_send = tracer.getRecorder().spanList[0];
            const span_dispatch = tracer.getRecorder().spanList[1];
            
            expect(span_send.className).toBe('AMQP');
            expect(span_send.domainName).toBe('Messaging');
            expect(span_send.operationName).toBe('tasks_callback');
            expect(span_send.spanContext.traceId).not.toBeUndefined();
            expect(span_send.spanContext.spanId).not.toBeUndefined();
            expect(span_send.tags['amqp.exchange']).toBe('');
            expect(span_send.tags['amqp.host']).toBe('localhost');
            expect(span_send.tags['amqp.port']).toBe(5672);
            expect(span_send.tags['amqp.routingKey']).toBe('tasks_callback');
            expect(span_send.tags['amqp.method']).toBe('basic.publish');
            expect(span_send.tags['operation.type']).toBe('publish');
            expect(span_send.tags['service.name']).toBe('amqp-default-service');
            expect(span_send.tags['span.type']).toBe('Amqplib');
            
            expect(span_dispatch.className).toBe('AMQP');
            expect(span_dispatch.domainName).toBe('Messaging');
            expect(span_dispatch.operationName).toBe('tasks_callback');
            expect(span_dispatch.spanContext.traceId).not.toBeUndefined();
            expect(span_dispatch.spanContext.spanId).not.toBeUndefined();
            expect(span_dispatch.tags['amqp.exchange']).toBe('');
            expect(span_dispatch.tags['amqp.message']).toBe('amqplib callback');
            expect(span_dispatch.tags['amqp.host']).toBe('localhost');
            expect(span_dispatch.tags['amqp.port']).toBe(5672);
            expect(span_dispatch.tags['amqp.routingKey']).toBe('tasks_callback');
            expect(span_dispatch.tags['operation.type']).toBe('deliver');
            expect(span_dispatch.tags['service.name']).toBe('amqp-default-service');
            expect(span_dispatch.tags['span.type']).toBe('Amqplib');
            expect(span_dispatch.tags['amqp.consumerTag']).not.toBeUndefined();

        });
    });
});