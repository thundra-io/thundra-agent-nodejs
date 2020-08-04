/**
 * Interface for implementations which decide
 * whether or not sampling should be done
 *
 * @param <T> type of the argument to be used for sampling decision
 */
interface Sampler<T> {

    /**
     * Checks whether or not sampling should be done.
     *
     * @param arg to be used for sampling decision
     * @return {@code true} if sampling should be done,
     *         {@code false} otherwise
     */
    isSampled(arg?: T): boolean;

}

export default Sampler;
