export default class TestRunError extends Error {

    static TestRunErrorBuilder = class {

        message: string;
        stack: string;
        timeout: boolean;

        withMessage(message: string) {
            this.message = message;
            return this;
        }

        withStack(stack: string) {
            this.stack = stack;
            return this;
        }

        withTimeout(timeout: boolean) {
            this.timeout = timeout;
            return this;
        }

        build() {
            return new TestRunError(
                this.message,
                this.stack,
                this.timeout,
            );
        }
    };

    timeout: boolean;

    constructor(message: string, stack?: string, timeout?: boolean) {
        super(message);
        super.stack = stack;

        this.timeout = timeout;
    }

    static builder() {
        return new TestRunError.TestRunErrorBuilder();
    }
}
