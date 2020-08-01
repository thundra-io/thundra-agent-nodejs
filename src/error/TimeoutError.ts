/**
 * Represents timeout errors (for ex. AWS Lambda invocation timeout)
 */
class TimeoutError extends Error {

    constructor(message: string) {
        super();
        this.message = message;
        this.name = 'TimeoutError';
        Error.captureStackTrace(this, TimeoutError);
        Object.setPrototypeOf(this, TimeoutError.prototype);
    }

}

export default TimeoutError;
