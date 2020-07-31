import TextMapPropagator from './TextMap';

/**
 * Propagator to inject/extract {@link ThundraSpanContext}
 * into/from HTTP request through headers
 */
class HttpPropagator extends TextMapPropagator {}

export default HttpPropagator;
