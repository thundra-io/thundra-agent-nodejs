/**
 * Represents HTTP operation related errors
 */
class HttpError extends Error {

    /* tslint:disable: variable-name */
    readonly __thundraGenerated: boolean = true;

    constructor(message: string) {
        super();
        this.message = message;
        this.name = 'HttpError';
        this.stack = '...';
        Object.setPrototypeOf(this, HttpError.prototype);
    }

}

export default HttpError;
