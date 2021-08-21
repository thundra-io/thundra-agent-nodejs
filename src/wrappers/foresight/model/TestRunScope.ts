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
        this.context = context;
    }
}

export class TestRunContext {
    totalCount: number;
    successfulCount: number;
    failedCount: number;
    ignoredCount: number;
    abortedCount: number;
}