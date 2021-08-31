export class GitEnvironmentInfo {

    repoURL: string;
    repoName: string;
    branch: string;
    commitHash: string;
    commitMessage: string;

    constructor(
        repoURL: string,
        repoName: string,
        branch: string,
        commitHash: string,
        commitMessage: string ) {
        this.repoURL = repoURL;
        this.repoName = repoName;
        this.branch = branch;
        this.commitHash = commitHash;
        this.commitMessage = commitMessage;
    }
}
