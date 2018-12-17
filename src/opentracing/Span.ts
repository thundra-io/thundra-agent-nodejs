import { Span } from 'opentracing';
import ThundraSpanContext from './SpanContext';
import Utils from '../plugins/utils/Utils';
import ThundraTracer from './Tracer';
import ThundraLogger from '../ThundraLogger';

class ThundraSpan extends Span {
  parentTracer: ThundraTracer;
  operationName: string;
  tags: any;
  startTime: number;
  finishTime: number;
  spanContext: ThundraSpanContext;
  rootTraceId: string;
  transactionId: string;
  logs: any[];
  className: string;
  domainName: string;
  order: number;

  constructor(tracer: any, fields: any) {
    super();
    fields = fields ? fields : {};
    const startTime = fields.startTime || Date.now();
    const operationName = fields.operationName ? fields.operationName : '';
    const parent = fields.parent || null;
    const tags = fields.tags || {};

    this.parentTracer = tracer;
    this.operationName = operationName;
    this.tags = Object.assign({}, tags);
    this.startTime = startTime;
    this.finishTime = 0;
    this.rootTraceId = fields.rootTraceId || null;
    this.transactionId = fields.transactionId || null;
    this.spanContext = this._createContext(parent);
    this.logs = [];
    this.className = fields.className;
    this.domainName = fields.domainName;
    this.order = fields.order;
  }

  getOperationName(): string {
    return this.operationName;
  }

  getTag(key: string): any {
    return this.tags[key];
  }

  setErrorTag(error: Error): void {
    if (error instanceof Error) {
      const err = Utils.parseError(error);
      this.setTag('error', true);
      this.setTag('error.kind', err.errorType);
      this.setTag('error.message', err.errorMessage);
      if (err.code) {
        this.setTag('error.code', err.code);
      }
      if (error.stack) {
        this.setTag('error.stack', err.stack);
      }
    }
  }

  _createContext(parent: any) {
    if (!this.parentTracer) {
      return;
    }

    let spanContext;
    if (parent) {
      spanContext = new ThundraSpanContext({
        traceId: parent.traceId,
        spanId: Utils.generateId(),
        parentId: parent.spanId,
        sampled: parent.sampled,
        baggageItems: Object.assign({}, parent.baggageItems),
        transactionId: parent.transactionId,
      });
    } else {
      spanContext = new ThundraSpanContext({
        traceId: this.rootTraceId,
        spanId: Utils.generateId(),
        transactionId: this.transactionId,
        sampled: this.parentTracer._isSampled(this),
      });
    }

    return spanContext;
  }

  _context() {
    return this.spanContext;
  }

  _tracer() {
    return this.parentTracer;
  }

  _setOperationName(name: string) {
    this.operationName = name;
  }

  _setBaggageItem(key: string | number, value: any) {
    this.spanContext.baggageItems[key] = value;
  }

  _getBaggageItem(key: string | number) {
    return this.spanContext.baggageItems[key];
  }

  _addTags(keyValuePairs: {
    [key: string]: any;
  }) {
    try {
      Object.keys(keyValuePairs).forEach((key) => {
        this.tags[key] = keyValuePairs[key];
      });
    } catch (e) {
      ThundraLogger.getInstance().debug(e);
    }
  }

  _finish(finishTime: number = Date.now()) {
    if (this.finishTime !== 0) {
      ThundraLogger.getInstance().debug('Span is already finished.');
      return;
    }

    this.finishTime = finishTime;
    if (this.spanContext.sampled) {
      this.parentTracer._record(this);
    }
  }

  close(finishTime: number = Date.now()) {
    if (this.finishTime !== 0) {
      ThundraLogger.getInstance().debug('Span is already closed.');
      return;
    }

    this.finishTime = finishTime;
    if (this.spanContext.sampled) {
      this.parentTracer._record(this, {disableActiveSpanHandling: true});
    }
  }

  isFinished() {
    return this.finishTime !== 0;
  }

  getDuration() {
    if (this.finishTime !== 0) {
      return this.finishTime - this.startTime;
    } else {
      return Date.now() - this.startTime;
    }
  }

  _log(keyValuePairs: { [key: string]: any; }, timestamp: number = Date.now()): void {
    if (!keyValuePairs && typeof keyValuePairs !== 'object') {
      return;
    }
    keyValuePairs.timestamp = timestamp;
    this.logs.push(keyValuePairs);
  }
}

export enum SpanEvent {
  SPAN_START,
  SPAN_FINISH,
}

export default ThundraSpan;
