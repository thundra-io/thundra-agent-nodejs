import ThundraSpanContext from '../SpanContext';

class BinaryPropagator {
    // tslint:disable-next-line:no-empty
    inject(spanContext: ThundraSpanContext, carrier: any) {}

    extract(carrier: any): any {
        return null;
    }
}

export default BinaryPropagator;
