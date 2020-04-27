import TextMapPropagator from '../../dist/opentracing/propagation/TextMap';
import SpanContext from '../../dist/opentracing/SpanContext';

describe('text map propagator', () => {
    describe('inject', () => {
        const textMapPropagator = new TextMapPropagator();
        const carrier = {};

        const spanContextProps = {
            traceId: 'traceId',
            spanId: 'spanId',
            transactionId: 'transactionId',
            parentId: 'transactionId',
            sampled: false,
            baggageItems: {
                prop1: 'prop1',
                prop2: 'prop2',
            }
        };

        const spanContext = new SpanContext(spanContextProps);
        
        textMapPropagator.inject(spanContext, carrier);

        test('should inject trace ids and baggage items', () => {
            expect(carrier[TextMapPropagator.TRACE_ID_KEY]).toBe(spanContext.traceId);
            expect(carrier[TextMapPropagator.SPAN_ID_KEY]).toBe(spanContext.spanId);
            expect(carrier[TextMapPropagator.TRANSACTION_ID_KEY]).toBe(spanContext.transactionId);
            expect(carrier[TextMapPropagator.BAGGAGE_PREFIX + 'prop1']).toBe('prop1');
            expect(carrier[TextMapPropagator.BAGGAGE_PREFIX + 'prop2']).toBe('prop2');
        });
    });

    describe('extract', () => {
        const textMapPropagator = new TextMapPropagator();
        const carrier = {};

        const extractedContext = textMapPropagator.extract(carrier);

        test('should not extract if the carrier does not have default keys', () => {
            expect(extractedContext).toBe(null);
        });
    });

    describe('extract', () => {
        const textMapPropagator = new TextMapPropagator();
        const carrier = {};

        carrier[TextMapPropagator.TRACE_ID_KEY] = 'traceId';
        carrier[TextMapPropagator.SPAN_ID_KEY] = 'spanId';
        carrier[TextMapPropagator.TRANSACTION_ID_KEY] = 'transactionId';
        carrier[TextMapPropagator.BAGGAGE_PREFIX + 'prop1'] = 'prop1';
        carrier[TextMapPropagator.BAGGAGE_PREFIX + 'prop2'] = 'prop2';

        const extractedContext = textMapPropagator.extract(carrier);

        test('should not extract traceids and baggage items', () => {
            expect(extractedContext).not.toBe(null);
            expect(extractedContext.spanId).toBe('spanId');
            expect(extractedContext.traceId).toBe('traceId');
            expect(extractedContext.transactionId).toBe('transactionId');
            expect(extractedContext.baggageItems.prop1).toBe('prop1');
            expect(extractedContext.baggageItems.prop2).toBe('prop2');
        });
    });
});