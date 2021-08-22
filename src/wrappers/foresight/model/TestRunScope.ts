export default class TestRunScope {
    id: string;
    taskId: string;
    startTimestamp: number;
    context: TestRunContext;

    constructor(
        id: string,
        taskId: string,
        startTimestamp: number,
        context: TestRunContext,
    ){
        this.id = id;
        this.taskId = taskId;
        this.startTimestamp = startTimestamp;
        this.context = context ? context : new TestRunContext();
    }

    increaseTotalCount() {
        this.context.totalCount++;
    }

    increareSuccessfulCount() {
        this.context.successfulCount++;
        this.increaseTotalCount();
    }

    increaseFailedCount() {
        this.context.failedCount++;
        this.increaseTotalCount();
    }

    increaseIgnoredCount() {
        this.context.ignoredCount++;
        this.increaseTotalCount();
    }
}

export class TestRunContext {
    totalCount: number = 0;
    successfulCount: number = 0;
    failedCount: number = 0;
    ignoredCount: number = 0; // this uses for skipped test counts ?
    abortedCount: number = 0; // this is not exists in Jest
}