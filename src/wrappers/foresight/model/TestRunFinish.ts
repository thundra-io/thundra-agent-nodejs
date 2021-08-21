import EnvironmentInfo from '../environment/EnvironmentInfo';
import TestRunMonitoringData from './TestRunMonitoringData';

export default class TestRunFinish extends TestRunMonitoringData {

    id: string;
    projectId: string;
    taskId: string;
    totalCount: number;
    successfulCount: number;
    failedCount: number;
    ignoredCount: number;
    abortedCount: number;
    startTimestamp: number;
    finishTimestamp: number;
    duration: number;
    hostName: string;
    environment: string;
    repoURL: string;
    repoName: string;
    branch: string;
    commitHash: string;
    commitMessage: string;
    tags: any;

    constructor(
        id: string,
        projectId: string,
        taskId: string,
        totalCount: number,
        successfulCount: number,
        failedCount: number,
        ignoredCount: number,
        abortedCount: number,
        startTimestamp: number,
        finishTimestamp: number,
        duration: number,
        hostName: string,
        environment: EnvironmentInfo,
        tags: any,
    ) {
        super('TestRunFinish');

        this.id = id;
        this.projectId = projectId;
        this.taskId = taskId;
        this.totalCount = totalCount;
        this.successfulCount = successfulCount;
        this.failedCount = failedCount;
        this.ignoredCount = ignoredCount;
        this.abortedCount = abortedCount;
        this.startTimestamp = startTimestamp;
        this.finishTimestamp = finishTimestamp;
        this.duration = duration;
        this.hostName = hostName;
        this.environment = environment != null ? environment.environment : undefined;
        this.repoURL = environment != null ? environment.repoURL : undefined;
        this.repoName = environment != null ? environment.repoName : undefined;
        this.branch = environment != null ? environment.branch : undefined;
        this.commitHash = environment != null ? environment.commitHash : undefined;
        this.commitMessage = environment != null ? environment.commitMessage : undefined;
        this.tags = tags;
    }

    static builder(){
        return new TestRunFinish.TestRunFinishBuilder();
    }

    static TestRunFinishBuilder = class {
        id: string;
        projectId: string;
        taskId: string;
        totalCount: number;
        successfulCount: number;
        failedCount: number;
        ignoredCount: number;
        abortedCount: number;
        startTimestamp: number;
        finishTimestamp: number;
        duration: number;
        hostName: string;
        environment: EnvironmentInfo;
        tags: any;

        withId(id: string) {
            this.id = id;
            return this;
        }

        withProjectId(projectId: string) {
            this.projectId = projectId;
            return this;
        }

        withTaskId(taskId: string) {
            this.taskId = taskId;
            return this;
        }

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

        withStartTimestamp(startTimestamp: number) {
            this.startTimestamp = startTimestamp;
            return this;
        }

        withFinishTimestamp(finishTimestamp: number) {
            this.finishTimestamp = finishTimestamp;
            return this;
        }

        withDuration(duration: number) {
            this.duration = duration;
            return this;
        }

        withHostName(hostName: string) {
            this.hostName = hostName;
            return this;
        }

        withEnvironmentInfo(environmentInfo: EnvironmentInfo) {
            this.environment = environmentInfo;
            return this;
        }

        withTags(tags: any) {
            this.tags = tags;
            return this;
        }

        withTag(name: string, value: any) {
            if (this.tags == null) {
                this.tags = {};
            }
            this.tags[name] = value;
            return this;
        }

        build() {
            return new TestRunFinish(
                this.id,
                this.projectId,
                this.taskId,
                this.totalCount,
                this.successfulCount,
                this.failedCount,
                this.ignoredCount,
                this.abortedCount,
                this.startTimestamp,
                this.finishTimestamp,
                this.duration,
                this.hostName,
                this.environment,
                this.tags);
        }
    }
}