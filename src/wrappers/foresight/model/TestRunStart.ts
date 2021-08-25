import EnvironmentInfo from '../environment/EnvironmentInfo';
import TestRunMonitoringData from './TestRunMonitoringData';

export default class TestRunStart extends TestRunMonitoringData {
    
    id: string;
    projectId: string;
    taskId: string;
    startTimestamp: number;
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
        startTimestamp: number,
        hostName: string,
        environment: EnvironmentInfo,
        tags: any
    ){
        super('TestRunStart');

        this.id = id;
        this.projectId = projectId;
        this.taskId = taskId;
        this.startTimestamp = startTimestamp;
        this.hostName = hostName;
        this.environment = environment ? environment.environment: undefined;
        this.repoURL = environment ?  environment.repoURL: undefined;
        this.repoName = environment ?  environment.repoName: undefined;
        this.branch = environment ?  environment.branch: undefined;
        this.commitHash = environment ?  environment.commitHash: undefined;
        this.commitMessage = environment ?  environment.commitMessage: undefined;
        this.tags = tags;
    }

    static builder(){
        return new TestRunStart.TestRunStartBuilder();
    }

    static TestRunStartBuilder = class {

        id: string;
        projectId: string;
        taskId: string;
        startTimestamp: number;
        hostName: string;
        environmentInfo: EnvironmentInfo;
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

        withStartTimestamp(startTimestamp: number) {
            this.startTimestamp = startTimestamp;
            return this;
        }

        withHostName(hostName: string) {
            this.hostName = hostName;
            return this;
        }

        withEnvironmentInfo(environmentInfo: EnvironmentInfo) {
            this.environmentInfo = environmentInfo;
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
            return new TestRunStart(
                this.id,
                this.projectId,
                this.taskId,
                this.startTimestamp,
                this.hostName,
                this.environmentInfo,
                this.tags);
        }
    }
} 