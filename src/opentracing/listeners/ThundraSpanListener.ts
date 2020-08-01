import ThundraSpan from '../Span';

/**
 * Interface for implementations which are notified
 * with {@link ThundraSpan} events such as start and finish
 */
interface ThundraSpanListener {

    /**
     * Called when listened {@link ThundraSpan} has started
     * @param {ThundraSpan} span the listened {@link ThundraSpan}
     * @param me the target object
     * @param callback the callback
     * @param args the arguments
     * @param {boolean} callbackAlreadyCalled indicated whether callback has already been called
     * @return {boolean} {@code true} if callback was called, {@code false} otherwise
     */
    onSpanStarted: (span: ThundraSpan, me?: any, callback?: () => any,
                    args?: any[], callbackAlreadyCalled?: boolean) => boolean;

    /**
     * Called when listened {@link ThundraSpan} has initialized
     * @param {ThundraSpan} span the listened {@link ThundraSpan}
     * @param me the target object
     * @param callback the callback
     * @param args the arguments
     * @param {boolean} callbackAlreadyCalled indicated whether callback has already been called
     * @return {boolean} {@code true} if callback was called, {@code false} otherwise
     */
    onSpanInitialized: (span: ThundraSpan, me?: any, callback?: () => any,
                        args?: any[], callbackAlreadyCalled?: boolean) => boolean;

    /**
     * Called when listened {@link ThundraSpan} has finished
     * @param {ThundraSpan} span the listened {@link ThundraSpan}
     * @param me the target object
     * @param callback the callback
     * @param args the arguments
     * @param {boolean} callbackAlreadyCalled indicated whether callback has already been called
     * @return {boolean} {@code true} if callback was called, {@code false} otherwise
     */
    onSpanFinished: (span: ThundraSpan, me?: any, callback?: () => any,
                     args?: any[], callbackAlreadyCalled?: boolean) => boolean;

    /**
     * Indicates whether should operation fail if this listener fails with error
     *
     * @return {boolean} {@code true} if operation should fail in case of error while calling this listener,
     *                   {@code false} otherwise
     */
    failOnError: () => boolean;

}

export default ThundraSpanListener;
