import { Tracer } from 'opentracing';
import { SpanContext } from 'opentracing';
import ExecutionContextManager from '../context/ExecutionContextManager';

/**
 * Thundra's global {@link Tracer} implementation
 */
class GlobalTracer extends Tracer {

    constructor() {
        super();
    }

    /**
     * Starts {@link Span}
     * @param {string} the name name of the span
     * @param fields the fields to be used while creating {@link Span}
     * @return {Span} the started {@link Span}
     */
    startSpan(name: any, fields: any) {
        return this._startSpan(name, fields);
    }

    /**
     * Injects given {@link SpanContext} into carrier
     * @param spanContext {@link SpanContext} to be injected
     * @param format the format of the data to be injected
     * @param carrier the carrier to be injected into
     */
    inject(spanContext: SpanContext, format: any, carrier: any): Tracer {
        return this._inject(spanContext, format, carrier);
    }

    /**
     * Extracts {@link SpanContext} from carrier
     * @param format the format of the data to be extracted
     * @param carrier the carrier to be extracted from
     * @return the extracted {@link SpanContext}
     */
    extract(format: any, carrier: any): SpanContext {
        return this._extract(format, carrier);
    }

    _startSpan(name: any, fields: any) {
        const { tracer } = ExecutionContextManager.get();
        if (!tracer) {
            return null;
        }
        return tracer._startSpan(name, fields);
    }

    _inject(spanContext: any, format: any, carrier: any): Tracer {
        const { tracer } = ExecutionContextManager.get();
        if (!tracer) {
            return null;
        }
        return tracer._inject(spanContext, format, carrier);
    }

    _extract(format: any, carrier: any): SpanContext {
        const { tracer } = ExecutionContextManager.get();
        if (!tracer) {
            return null;
        }
        return tracer._extract(format, carrier);
    }

}

export default GlobalTracer;
