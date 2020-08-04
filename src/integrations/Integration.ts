import ThundraTracer from '../opentracing/Tracer';

/**
 * Interface for all integrations
 */
interface Integration {

    config: any;

    /**
     * Wraps the given library for integration
     * @param lib the library to be wrapped
     * @param tracer the {@link ThundraTracer}
     * @param config the config
     */
    wrap: (lib: any, tracer: ThundraTracer, config: any) => void;

    /**
     * Unwraps the wrapped library
     */
    unwrap: () => void;

}

export default Integration;
