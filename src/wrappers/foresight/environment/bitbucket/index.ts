import ConfigProvider from '../../../../config/ConfigProvider';
import ConfigNames from '../../../../config/ConfigNames';
import EnvironmentInfo from '../../model/EnvironmentInfo';
import TestRunnerUtils from '../../../../utils/TestRunnerUtils';
import ThundraLogger from '../../../../ThundraLogger';
import * as GitHelper from '../git/helper';
import * as GitEnvironmentInfo from '../git';

export const ENVIRONMENT = 'BitBucket';

let environmentInfo: EnvironmentInfo;

const getTestRunId = (repoURL: string, commitHash: string) => {

    const testRunId = ConfigProvider.get<string>(ConfigNames.THUNDRA_AGENT_TEST_RUN_ID);
    if (testRunId) {
        return testRunId;
    }

    const buildNumber = process.env[ConfigNames.BITBUCKET_BUILD_NUMBER_ENV_VAR_NAME]
        || process.env[ConfigNames.BITBUCKET_BUILD_NUMBER_ENV_VAR_NAME.toLowerCase()];

    if (buildNumber) {
        return TestRunnerUtils.getTestRunId(ENVIRONMENT, repoURL, commitHash, buildNumber);
    } else {
        return TestRunnerUtils.getDefaultTestRunId(ENVIRONMENT, repoURL, commitHash);
    }
};

const isBitBucketEnvironment = () => {
    return (process.env[ConfigNames.BITBUCKET_GIT_HTTP_ORIGIN_ENV_VAR_NAME]
        || process.env[ConfigNames.BITBUCKET_GIT_HTTP_ORIGIN_ENV_VAR_NAME.toLowerCase()] != null);
};

/**
 * Get environment info
 */
export const getEnvironmentInfo = () => {

    return environmentInfo;
};

/**
 * Initiate Bitbucket Environment Info
 */
export const init = async (): Promise<void> => {
    try {
        if (environmentInfo == null && isBitBucketEnvironment()) {

            let repoURL = process.env[ConfigNames.BITBUCKET_GIT_HTTP_ORIGIN_ENV_VAR_NAME]
                || process.env[ConfigNames.BITBUCKET_GIT_HTTP_ORIGIN_ENV_VAR_NAME.toLowerCase()];
            if (!repoURL) {

                repoURL = process.env[ConfigNames.BITBUCKET_GIT_SSH_ORIGIN_ENV_VAR_NAME]
                    || process.env[ConfigNames.BITBUCKET_GIT_SSH_ORIGIN_ENV_VAR_NAME.toLowerCase()];
            }

            const repoName = GitHelper.extractRepoName(repoURL);

            let branch = process.env[ConfigNames.BITBUCKET_BRANCH_ENV_VAR_NAME]
                || process.env[ConfigNames.BITBUCKET_BRANCH_ENV_VAR_NAME.toLowerCase()];

            let commitHash = process.env[ConfigNames.BITBUCKET_COMMIT_ENV_VAR_NAME]
                || process.env[ConfigNames.BITBUCKET_COMMIT_ENV_VAR_NAME.toLowerCase()];

            const gitEnvironmentInfo = GitEnvironmentInfo.getEnvironmentInfo();

            let commitMessage = '';
            if (gitEnvironmentInfo) {
                commitMessage = gitEnvironmentInfo.commitMessage;

                if (branch) {
                    branch = gitEnvironmentInfo.branch;
                }

                if (commitHash) {
                    commitHash = gitEnvironmentInfo.commitHash;
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
