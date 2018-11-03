import { Tracer } from 'opentracing';
import ThundraSpan, { SpanEvent } from './Span';
import ThundraRecorder from './Recorder';
import Utils from '../plugins/Utils';

class ThundraTracer extends Tracer {
  static instance: ThundraTracer;

  tags: any;
  recorder: ThundraRecorder;
  activeSpans: Map<string, ThundraSpan>;

  constructor(config: any = {}) {
    super();

    this.tags = config.tags;
    this.recorder = config.recorder ? config.recorder : new ThundraRecorder();
    this.activeSpans = new Map<string, ThundraSpan>();
    ThundraTracer.instance = this;
  }

  static getInstance(): ThundraTracer {
    return ThundraTracer.instance ? ThundraTracer.instance : new ThundraTracer();
  }

  getActiveSpan(): ThundraSpan {
    return this.recorder.getActiveSpan();
  }

  setActiveSpan(span: ThundraSpan) {
    this.recorder.setActiveSpan(span);
  }

  removeActiveSpan(): ThundraSpan {
    return this.recorder.removeActiveSpan();
  }

  finishSpan(): void {
    if (this.getActiveSpan()) {
      this.getActiveSpan().finish();
    }
  }

  getRecorder(): ThundraRecorder {
    return this.recorder;
  }

  destroy(): void {
    this.recorder.destroy();
    this.activeSpans.clear();
  }

  wrapper<T extends (...args: any[]) => any>(spanName: string, func: T): T {
    const activeSpan = this.getActiveSpan();
    const span: ThundraSpan = this.startSpan(spanName, { childOf: activeSpan }) as ThundraSpan;
    // tslint:disable-next-line:no-angle-bracket-type-assertion
    return <T> ((...args: any[]) => {
      try {
        const returnValue = func(...args);
        span.finish();
        return returnValue;
      } catch (error) {
        span.finish();
        throw error;
      }
    });
  }

  _startSpan(name: any, fields: any) {
    const tags: any = {};
    let span;
    const rootTraceId = fields.rootTraceId ? fields.rootTraceId : Utils.generateId();

    const parentContext = Utils.getParentContext(fields.references);

    if (parentContext && !this.activeSpans.get(parentContext.spanId)) {
      throw new Error('Invalid spanId : ' + parentContext.spanId);
    }

    if (parentContext) {
      span = new ThundraSpan(this, {
        operationName: fields.operationName || name,
        parent: parentContext,
        tags: Object.assign(tags, this.tags, fields.tags),
        startTime: fields.startTime,
        rootTraceId,
        className: fields.className,
        domainName: fields.domainName,
      });
    } else {
      span = new ThundraSpan(this, {
        operationName: name,
        parent: this.getActiveSpan() ? this.getActiveSpan().spanContext : null,
        tags: Object.assign(tags, this.tags, fields.tags),
        rootTraceId,
        startTime: Date.now(),
        className: fields.className,
        domainName: fields.domainName,
      });
    }

    this.recorder.record(
        span,
        SpanEvent.SPAN_START,
        {
          disableActiveSpanHandling: fields.disableActiveStart === true,
        });
    this.activeSpans.set(span.spanContext.spanId, span);
    return span;
  }

  _record(span: ThundraSpan, options?: any) {
    this.recorder.record(span, SpanEvent.SPAN_FINISH, options);
    this.activeSpans.delete(span.spanContext.spanId);
  }

  _inject(spanContext: any, format: any, carrier: any) {
    throw new Error('Thundra Tracer does not support inject.');
  }

  _extract(format: any, carrier: any) {
    throw new Error('Thundra Tracer does not support extract.');
    // This unreachable code is for making ts-compiler happy
    return this;
  }

  _isSampled(span: ThundraSpan) {
    return true;
  }
}

export default ThundraTracer;
