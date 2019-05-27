class ThundraChaosError extends Error {
    constructor(message: string) {
        super();
        this.message = message;
        this.name = 'ThundraChaosError';
        Error.captureStackTrace(this, ThundraChaosError);
        Object.setPrototypeOf(this, ThundraChaosError.prototype);
    }
}

export default ThundraChaosError;
