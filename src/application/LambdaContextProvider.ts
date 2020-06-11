export class LambdaContextProvider {
    static context: any;

    static setContext(context: any) {
        LambdaContextProvider.context = context;
    }

    static getContext() {
        return LambdaContextProvider.context;
    }
}
