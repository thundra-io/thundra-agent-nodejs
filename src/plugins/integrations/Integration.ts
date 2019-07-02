import ThundraTracer from '../../opentracing/Tracer';

interface Integration {
    lib: any;
    config: any;
    version: string;
    basedir: string;
    wrapped: boolean;

    wrap: (lib: any, tracer: ThundraTracer, config: any) => void;
    unwrap: () => void;
}

export default Integration;
