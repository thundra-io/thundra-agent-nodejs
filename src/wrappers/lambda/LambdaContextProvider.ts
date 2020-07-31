/**
 * Provides active Lambda context during invocation.
 */
export class LambdaContextProvider {

    static context: any;

    /**
     * Gets the AWS Lambda invocation context
     * @return the AWS Lambda invocation context
     */
    static getContext() {
        return LambdaContextProvider.context;
    }

    /**
     * Sets the AWS Lambda invocation context
     * @param context the AWS Lambda invocation context to be set
     */
    static setContext(context: any) {
        LambdaContextProvider.context = context;
    }

}
