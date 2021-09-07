import { GitEnvironmentInfo } from './GitEnvironmentInfo';

export default class EnvironmentInfo extends GitEnvironmentInfo {

    testRunId: string;
    environment: string;
    repoURL: string;
    repoName: string;
    branch: string;
    commitHash: string;
    commitMessage: string;

    constructor(
        testRunId: string,
        environment: string,
        repoURL: string,
        repoName: string,
        branch: string,
        commitHash: string,
        commitMessage: string,
    ) {
        super(repoURL, repoName, branch, commitHash, commitMessage);

        this.testRunId = testRunId;
        this.environment = environment;
    }
}
