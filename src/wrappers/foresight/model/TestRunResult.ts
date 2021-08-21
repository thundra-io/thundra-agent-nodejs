export default class TestRunResult {

    totalCount: number;
    successfulCount: number;
    failedCount: number;
    ignoredCount: number;
    abortedCount: number;

    constructor(
        totalCount: number,
        successfulCount: number,
        failedCount: number,
        ignoredCount: number,
        abortedCount: number
    ) {
        this.totalCount = totalCount;
        this.successfulCount = successfulCount;
        this.failedCount = failedCount;
        this.ignoredCount = ignoredCount;
        this.abortedCount = abortedCount;
    }

    static builder(){
        return new TestRunResult.TestRunResultBuilder();
    }

    static TestRunResultBuilder = class {

        totalCount: number;
        successfulCount: number;
        failedCount: number;
        ignoredCount: number;
        abortedCount: number;


        withTotalCount(totalCount: number) {
            this.totalCount = totalCount;
            return this;
        }

        withSuccessfulCount(successfulCount: number) {
            this.successfulCount = successfulCount;
            return this;
        }

        withFailedCount(failedCount: number) {
            this.failedCount = failedCount;
            return this;
        }

        withIgnoredCount(ignoredCount: number) {
            this.ignoredCount = ignoredCount;
            return this;
        }

        withAbortedCount(abortedCount: number) {
            this.abortedCount = abortedCount;
            return this;
        }

        build() {
            return new TestRunResult(
                this.totalCount, 
                this.successfulCount, 
                this.failedCount, 
                this.ignoredCount, 
                this.abortedCount);
        }
    }
}