import { SpanContext } from 'opentracing';

/**
 * Thundra's {@link SpanContext} implementation
 */
class ThundraSpanContext extends SpanContext {

    readonly traceId: any;
    readonly spanId: any;
    readonly transactionId: any;
    readonly parentId: any;
    readonly sampled: any;
    readonly baggageItems: any;

    constructor(props: any) {
        super();
        this.transactionId = props.transactionId;
        this.traceId = props.traceId;
        this.spanId = props.spanId;
        this.parentId = props.parentId || null;
        this.sampled = props.sampled === undefined || props.sampled;
        this.baggageItems = props.baggageItems || {};
    }

}

export default ThundraSpanContext;
