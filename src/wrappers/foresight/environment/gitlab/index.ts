import ConfigProvider from '../../../../config/ConfigProvider';
import ConfigNames from '../../../../config/ConfigNames';
import EnvironmentInfo from '../../model/EnvironmentInfo';
import TestRunnerUtils from '../../../../utils/TestRunnerUtils';
import ThundraLogger from '../../../../ThundraLogger';
import * as GitHelper from '../git/helper';
import * as GitEnvironmentInfo from '../git';

export const ENVIRONMENT = 'GitLab';

let environmentInfo: EnvironmentInfo;

const getTestRunId = (repoURL: string, commitHash: string) => {

    const testRunId = ConfigProvider.get<string>(ConfigNames.THUNDRA_AGENT_TEST_RUN_ID);
    if (testRunId) {
        return testRunId;
    }

    const jobURL = process.env[ConfigNames.CI_JOB_URL_ENV_VAR_NAME]
        || process.env[ConfigNames.CI_JOB_URL_ENV_VAR_NAME.toLowerCase()];
    const jobId = process.env[ConfigNames.CI_JOB_ID_ENV_VAR_NAME]
        || process.env[ConfigNames.CI_JOB_ID_ENV_VAR_NAME.toLowerCase()];

    if (jobURL || jobId) {
        return TestRunnerUtils.getTestRunId(ENVIRONMENT, repoURL, commitHash, jobURL + '_' + jobId);
    } else {
        return TestRunnerUtils.getDefaultTestRunId(ENVIRONMENT, repoURL, commitHash);
    }
};

const isGitLabEnvironment = () => {
    return (process.env[ConfigNames.GITLAB_CI_ENV_VAR_NAME]
        || process.env[ConfigNames.GITLAB_CI_ENV_VAR_NAME.toLowerCase()] != null);
};

export const getEnvironmentInfo = () => {

    return environmentInfo;
};

export const init = async (): Promise<void> => {
    try {
        if (environmentInfo == null && isGitLabEnvironment()) {

            const repoURL = process.env[ConfigNames.CI_REPOSITORY_URL_ENV_VAR_NAME]
                || process.env[ConfigNames.CI_REPOSITORY_URL_ENV_VAR_NAME.toLowerCase()];

            const repoName = GitHelper.extractRepoName(repoURL);

            let branch = process.env[ConfigNames.CI_COMMIT_BRANCH_ENV_VAR_NAME]
                || process.env[ConfigNames.CI_COMMIT_BRANCH_ENV_VAR_NAME.toLowerCase()];

            if (branch) {
                branch = process.env[ConfigNames.CI_COMMIT_REF_NAME_ENV_VAR_NAME]
                    || process.env[ConfigNames.CI_COMMIT_REF_NAME_ENV_VAR_NAME.toLowerCase()];
            }

            let commitHash = process.env[ConfigNames.CI_COMMIT_SHA_ENV_VAR_NAME]
                || process.env[ConfigNames.CI_COMMIT_SHA_ENV_VAR_NAME.toLowerCase()];

            let commitMessage = process.env[ConfigNames.CI_COMMIT_MESSAGE_ENV_VAR_NAME]
                || process.env[ConfigNames.CI_COMMIT_MESSAGE_ENV_VAR_NAME.toLowerCase()];

            const gitEnvironmentInfo = GitEnvironmentInfo.getEnvironmentInfo();
            if (gitEnvironmentInfo) {

                if (!branch) {
                    branch = gitEnvironmentInfo.branch;
                }

                if (!commitHash) {
                    commitHash = gitEnvironmentInfo.commitHash;
                }

                if (!commitMessage) {
                    commitMessage = gitEnvironmentInfo.commitMessage;
                }
            }

            const testRunId = getTestRunId(repoURL, commitHash);

            environmentInfo = new EnvironmentInfo(testRunId, ENVIRONMENT, repoURL, repoName, branch, commitHash, commitMessage);
        }
    } catch (e) {
        ThundraLogger.error(
            `<GithubEnvironmentInfoProvider> Unable to build environment info`);
    }
};
