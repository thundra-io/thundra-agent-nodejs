import { Tracer } from 'opentracing';
import * as opentracing from 'opentracing';
import ThundraSpan, { SpanEvent } from './Span';
import ThundraRecorder from './Recorder';
import Utils from '../utils/Utils';
import ThundraSpanListener from '../listeners/ThundraSpanListener';
import TextMapPropagator from './propagation/TextMap';
import HttpPropagator from './propagation/Http';
import BinaryPropagator from './propagation/Binary';
import ThundraLogger from '../ThundraLogger';
import ThundraSpanContext from './SpanContext';
import { LineByLineTags } from '../Constants';

/**
 * Thundra's {@link Tracer} implementation
 */
class ThundraTracer extends Tracer {

    private tags: any;
    private recorder: ThundraRecorder;
    private activeSpans: Map<string, ThundraSpan>;
    private transactionId: string;
    private propagators: any;
    private invokeCallback = true;

    constructor(config: any = {}) {
        super();

        this.tags = config.tags;
        this.recorder = config.recorder ? config.recorder : new ThundraRecorder();
        this.activeSpans = new Map<string, ThundraSpan>();

        this.propagators = {
            [opentracing.FORMAT_TEXT_MAP]: new TextMapPropagator(),
            [opentracing.FORMAT_HTTP_HEADERS]: new HttpPropagator(),
            [opentracing.FORMAT_BINARY]: new BinaryPropagator(),
        };
    }

    /**
     * Gets the active transaction id
     * @return {string} the active transaction id
     */
    getTransactionId(): string {
        return this.transactionId;
    }

    /**
     * Sets the active transaction id
     * @param {string} transactionId the transaction id to be set as active
     */
    setTransactionId(transactionId: string) {
        this.transactionId = transactionId;
    }

    /**
     * Gets the active {@link ThundraSpan}
     * @return {ThundraSpan} the active {@link ThundraSpan}
     */
    getActiveSpan(): ThundraSpan {
        return this.recorder.getActiveSpan();
    }

    /**
     * Gets the active {@link ThundraSpan}
     * @param span the active {@link ThundraSpan} to be set
     */
    setActiveSpan(span: ThundraSpan) {
        this.recorder.setActiveSpan(span);
    }

    /**
     * Removes the active {@link ThundraSpan}
     * @return {ThundraSpan} the removed active {@link ThundraSpan}
     */
    removeActiveSpan(): ThundraSpan {
        return this.recorder.removeActiveSpan();
    }

    /**
     * Finishes the active {@link ThundraSpan}
     */
    finishSpan(): void {
        if (this.getActiveSpan()) {
            this.getActiveSpan().finish();
        }
    }

    /**
     * Gets the {@link ThundraRecorder}
     * @return {ThundraRecorder} the {@link ThundraRecorder}
     */
    getRecorder(): ThundraRecorder {
        return this.recorder;
    }

    /**
     * Gets the recorded {@link ThundraSpan}s
     * @record {ThundraSpan[]} the recorded {@link ThundraSpan}s
     */
    getSpanList(): ThundraSpan[] {
        return this.recorder.getSpanList();
    }

    /**
     * Adds/registers the given {@link ThundraSpanListener}
     * @param {ThundraSpanListener} listener the {@link ThundraSpanListener} to be added/registered
     */
    addSpanListener(listener: ThundraSpanListener) {
        if (!listener) {
            throw new Error('No listener provided.');
        }

        this.recorder.addSpanListener(listener);
    }

    /**
     * Sets/registers the given {@link ThundraSpanListener}s
     * @param {ThundraSpanListener[]} listeners the {@link ThundraSpanListener}s to be added/registered
     */
    setSpanListeners(listeners: ThundraSpanListener[]) {
        this.recorder.setSpanListeners(listeners);
    }

    /**
     * Resets the tracer
     */
    reset(): void {
        this.recorder.clear();
        this.activeSpans.clear();
    }

    /**
     * Destroys the tracer
     */
    destroy(): void {
        this.recorder.destroy();
        this.activeSpans.clear();
    }

    /**
     * Wraps the given function and traces its call/execution
     * @param {string} spanName name of the span
     * @param func the function to be wrapped and traces
     */
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
        const spanId = fields.spanId || Utils.generateId();
        const rootTraceId = fields.rootTraceId || Utils.generateId();
        const parentContext = fields.parentContext || Utils.getParentContext(fields.references);
        const parentSpan = fields.childOf || this.getActiveSpan();

        if (parentContext) {
            span = new ThundraSpan(this, {
                rootTraceId,
                transactionId: this.transactionId,
                spanId,
                parent: parentContext,
                operationName: fields.operationName || name,
                startTime: fields.startTime || Date.now(),
                className: fields.className,
                domainName: fields.domainName,
                tags: Object.assign(tags, this.tags, fields.tags),
            });
        } else {
            span = new ThundraSpan(this, {
                rootTraceId,
                transactionId: this.transactionId,
                spanId,
                parent: parentSpan ? parentSpan.spanContext : null,
                operationName: fields.operationName || name,
                startTime: fields.startTime || Date.now(),
                className: fields.className,
                domainName: fields.domainName,
                tags: Object.assign(tags, this.tags, fields.tags),
            });
        }

        if (parentSpan && parentSpan.getTag(LineByLineTags.LINES)) {
            this._injectLineByLineTags(span, parentSpan);
        }

        this.recorder.record(
            span,
            SpanEvent.SPAN_START,
            {
                disableActiveSpanHandling: fields.disableActiveStart === true,
                me: fields.me,
                callback: fields.callback,
                args: fields.args,
            });
        this.activeSpans.set(span.spanContext.spanId, span);

        return span;
    }

    _injectLineByLineTags(span: ThundraSpan, parentSpan: ThundraSpan) {
        const lines = parentSpan.getTag(LineByLineTags.LINES);
        if (lines && lines.length > 0) {
            const lastLine = lines[lines.length - 1];
            const spanId = span.spanContext.spanId;

            if (!lastLine[LineByLineTags.NEXT_SPAN_IDS]) {
                lastLine[LineByLineTags.NEXT_SPAN_IDS] = [];
            }

            lastLine[LineByLineTags.NEXT_SPAN_IDS] = [...lastLine[LineByLineTags.NEXT_SPAN_IDS], spanId];
        }
    }

    _record(span: ThundraSpan, options?: any) {
        this.recorder.record(span, SpanEvent.SPAN_FINISH, options);
        this.activeSpans.delete(span.spanContext.spanId);
    }

    _initialized(span: ThundraSpan, options?: any) {
        options = options ? options : {};
        this.recorder.record(span, SpanEvent.SPAN_INITIALIZE, options);
    }

    _inject(spanContext: any, format: any, carrier: any): ThundraTracer {
        try {
            this.propagators[format].inject(spanContext, carrier);
        } catch (e) {
            ThundraLogger.error('<Tracer> Error occurred while injecting carrier into span context:', e);
        }

        return this;
    }

    _extract(format: any, carrier: any): ThundraSpanContext {
        if (!carrier) {
            return null;
        }

        try {
            return this.propagators[format].extract(carrier);
        } catch (e) {
            ThundraLogger.error('<Tracer> Error occurred while extracting span context from carrier:', e);
            return null;
        }
    }

    _isSampled(span: ThundraSpan) {
        return true;
    }

}

export default ThundraTracer;
