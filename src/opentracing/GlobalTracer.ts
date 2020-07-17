import { Tracer } from 'opentracing';
import { SpanContext } from 'opentracing';
import * as contextManager from '../context/contextManager';

class GlobalTracer extends Tracer {
    constructor() {
        super();
    }

    startSpan(name: any, fields: any) {
        return this._startSpan(name, fields);
    }

    inject(spanContext: any, format: any, carrier: any): Tracer {
        return this._inject(spanContext, format, carrier);
    }

    extract(format: any, carrier: any): SpanContext {
        return this._extract(format, carrier);
    }

    _startSpan(name: any, fields: any) {
        const { tracer } = contextManager.get();
        if (tracer) {
            return null;
        }
        return tracer._startSpan(name, fields);
    }

    _inject(spanContext: any, format: any, carrier: any): Tracer {
        const { tracer } = contextManager.get();
        if (tracer) {
            return null;
        }
        return tracer._inject(spanContext, format, carrier);
    }

    _extract(format: any, carrier: any): SpanContext {
        const { tracer } = contextManager.get();
        if (tracer) {
            return null;
        }
        return tracer._extract(format, carrier);
    }
}

export default GlobalTracer;
