import ThundraSpanContext from '../SpanContext';

class TextMapPropagator {
    static TRACE_ID_KEY: string =   'x-thundra-trace-id';
    static TRANSACTION_ID_KEY: string =  'x-thundra-transaction-id';
    static SPAN_ID_KEY: string = 'x-thundra-span-id';
    static BAGGAGE_PREFIX: string = 'x-thundra-baggage-';
    static BAGGAGE_PATTERN: RegExp = new RegExp(`^${TextMapPropagator.BAGGAGE_PREFIX}(.+)$`);

    inject(spanContext: ThundraSpanContext, carrier: any) {
        if (spanContext.traceId) {
            carrier[TextMapPropagator.TRACE_ID_KEY] = spanContext.traceId.toString();
        }

        if (spanContext.spanId) {
            carrier[TextMapPropagator.SPAN_ID_KEY] = spanContext.spanId.toString();
        }

        if (spanContext.transactionId) {
            carrier[TextMapPropagator.TRANSACTION_ID_KEY] = spanContext.transactionId.toString();
        }

        this._injectBaggageItems(spanContext, carrier);
    }

    extract(carrier: any) {
        if (!carrier[TextMapPropagator.TRACE_ID_KEY]
            || !carrier[TextMapPropagator.SPAN_ID_KEY]
            || !carrier[TextMapPropagator.TRANSACTION_ID_KEY]) {
            return null;
        }

        const spanContext = new ThundraSpanContext({
            traceId: carrier[TextMapPropagator.TRACE_ID_KEY],
            spanId: carrier[TextMapPropagator.SPAN_ID_KEY],
            transactionId: carrier[TextMapPropagator.TRANSACTION_ID_KEY],
        });

        this._extractBaggageItems(carrier, spanContext);

        return spanContext;
    }

    _injectBaggageItems(spanContext: ThundraSpanContext, carrier: any) {
        if (spanContext.baggageItems) {
            Object.keys(spanContext.baggageItems).forEach((key) => {
                carrier[TextMapPropagator.BAGGAGE_PREFIX + key] = String(spanContext.baggageItems[key]);
            });
        }
    }

    _extractBaggageItems(carrier: any, spanContext: ThundraSpanContext) {
        Object.keys(carrier).forEach((key)  => {
            const result = key.match(TextMapPropagator.BAGGAGE_PATTERN);
            if (result) {
              spanContext.baggageItems[result[1]] = carrier[key];
            }
        });
    }
}

export default TextMapPropagator;
