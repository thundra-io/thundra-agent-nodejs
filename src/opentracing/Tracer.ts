import { Tracer, Reference, Tags } from 'opentracing';
import * as opentracing from 'opentracing';
import ThundraSpan, { SpanEvent } from './Span';
import ThundraSpanContext from './SpanContext';
import ThundraRecorder from './Recorder';
import ThundraSampler from './Sampler';
import Utils from '../plugins/Utils';

class ThundraTracer extends Tracer {
  tags: any;
  recorder: ThundraRecorder;
  sampler: ThundraSampler;
  activeSpans: Map<string, ThundraSpan>;

  constructor(config: any = {}) {
    super();

    this.tags = config.tags;
    this.recorder = config.recorder ? config.recorder : new ThundraRecorder();
    this.sampler = config.sampler ? config.sampler : new ThundraSampler(1);
    this.activeSpans = new Map<string, ThundraSpan>();
  }

  getActiveSpan(): ThundraSpan {
    return this.recorder.getActiveSpan() ? this.recorder.getActiveSpan().value : null;
  }

  finishSpan(): void {
    if (this.getActiveSpan()) {
       this.getActiveSpan().finish();
    }
  }

  getRecorder(): ThundraRecorder {
    return this.recorder;
  }

  destroy() {
    this.recorder.destroy();
    this.activeSpans = null;
  }

  wrapper<T extends (...args: any[]) => any>(spanName: string, func: T): T {
    // tslint:disable-next-line:no-angle-bracket-type-assertion
    return <T> ((...args: any[]) => {
      try {
        this.startSpan(spanName);
        const returnValue = func(...args);
        this.finishSpan();
        return returnValue;
      } catch (error) {
        this.finishSpan();
      }
    });
  }

  _startSpan(name: any, fields: any) {
    const tags: any = {};
    let span;
    const rootTraceId = fields.rootTraceId ? fields.rootTraceId : Utils.generateId();

    const parentContext = getParent(fields.references);

    if (parentContext && !this.activeSpans.get(parentContext.spanId)) {
        throw new Error('Invalid spanId : ' + parentContext.spanId);
    }

    if (fields) {
      span = new ThundraSpan(this, {
        operationName: fields.operationName || name,
        parent: getParent(fields.references),
        tags: Object.assign(tags, this.tags, fields.tags),
        startTime: fields.startTime,
        rootTraceId,
        className: fields.className,
        domainName: fields.domainName,
      });
    } else {
      span = new ThundraSpan(this, {
        operationName: name,
        parent: this.getActiveSpan(),
        tags: this.tags,
        startTime: Date.now(),
        className: fields.className,
        domainName: fields.domainName,
      });
    }

    this.recorder.record(span, SpanEvent.SPAN_START);
    this.activeSpans.set(span.spanContext.spanId, span);
    return span;
  }

  _record(span: ThundraSpan) {
    this.recorder.record(span, SpanEvent.SPAN_FINISH);
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
    return this.sampler.isSampled(span);
  }
}

function getParent(references: any): ThundraSpanContext {
  let parent: ThundraSpanContext = null;
  if (references) {
    for (const ref of references) {
      if (!(ref instanceof Reference)) {
        console.log(`Expected ${ref} to be an instance of opentracing.Reference`);
        break;
      }
      const spanContext = ref.referencedContext();

      if (!(spanContext instanceof ThundraSpanContext)) {
        console.log(`Expected ${spanContext} to be an instance of SpanContext`);
        break;
      }

      if (ref.type() === opentracing.REFERENCE_CHILD_OF) {
        parent = ref.referencedContext() as ThundraSpanContext;
        break;
      } else if (ref.type() === opentracing.REFERENCE_FOLLOWS_FROM) {
        if (!parent) {
          parent = ref.referencedContext() as ThundraSpanContext;
        }
      }
    }
  }

  return parent;
}

export default ThundraTracer;
