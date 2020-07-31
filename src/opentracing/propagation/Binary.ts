import ThundraSpanContext from '../SpanContext';

/**
 * Propagator to inject/extract {@link ThundraSpanContext}
 * into/from carrier as binary
 */
class BinaryPropagator {

    /**
     * Injects given {@link ThundraSpanContext} into carrier as binary
     * @param spanContext {@link ThundraSpanContext} to be injected
     * @param carrier the carried to be injected into
     */
    // tslint:disable-next-line:no-empty
    inject(spanContext: ThundraSpanContext, carrier: any) {
        // Not supported yet
    }

    /**
     * Extracts {@link ThundraSpanContext} from carrier as binary
     * @param carrier the carrier to be extracted from
     * @return the extracted {@link ThundraSpanContext}
     */
    extract(carrier: any): any {
        // Not supported yet
        return null;
    }

}

export default BinaryPropagator;
