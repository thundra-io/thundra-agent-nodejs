import ThundraTracer from '../../opentracing/Tracer';

interface Integration {
    config: any;

    wrap: (lib: any, tracer: ThundraTracer, config: any) => void;
    unwrap: () => void;
}

export default Integration;
