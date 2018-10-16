interface Sampler<T> {
    isSampled(arg?: T): boolean;
}

export default Sampler;
