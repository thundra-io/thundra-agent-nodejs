import { Tracer } from 'opentracing';
import { SpanContext } from 'opentracing';
import ExecutionContextManager from '../context/ExecutionContextManager';

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
        const { tracer } = ExecutionContextManager.get();
        if (tracer) {
            return null;
        }
        return tracer._startSpan(name, fields);
    }

    _inject(spanContext: any, format: any, carrier: any): Tracer {
        const { tracer } = ExecutionContextManager.get();
        if (tracer) {
            return null;
        }
        return tracer._inject(spanContext, format, carrier);
    }

    _extract(format: any, carrier: any): SpanContext {
        const { tracer } = ExecutionContextManager.get();
        if (tracer) {
            return null;
        }
        return tracer._extract(format, carrier);
    }
}

export default GlobalTracer;
