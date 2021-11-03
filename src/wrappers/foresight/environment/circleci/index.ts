import ConfigProvider from '../../../../config/ConfigProvider';
import ConfigNames from '../../../../config/ConfigNames';
import EnvironmentInfo from '../../model/EnvironmentInfo';
import TestRunnerUtils from '../../../../utils/TestRunnerUtils';
import ThundraLogger from '../../../../ThundraLogger';
import * as GitHelper from '../git/helper';
import * as GitEnvironmentInfo from '../git';

export const ENVIRONMENT = 'CircleCI';

let environmentInfo: EnvironmentInfo;

const getTestRunId = (repoURL: string, commitHash: string) => {
    const testRunId = ConfigProvider.get<string>(ConfigNames.THUNDRA_AGENT_TEST_RUN_ID);
    if (testRunId) {
        return testRunId;
    }

    const buildURL = process.env[ConfigNames.CIRCLE_BUILD_URL_ENV_VAR_NAME]
        || process.env[ConfigNames.CIRCLE_BUILD_URL_ENV_VAR_NAME.toLowerCase()];
    const buildNum = process.env[ConfigNames.CIRCLE_BUILD_NUM_ENV_VAR_NAME]
        || process.env[ConfigNames.CIRCLE_BUILD_NUM_ENV_VAR_NAME.toLowerCase()];

    if (buildURL || buildNum) {
        return TestRunnerUtils.getTestRunId(ENVIRONMENT, repoURL, commitHash, buildURL + '_' + buildNum);
    } else {
        return TestRunnerUtils.getDefaultTestRunId(ENVIRONMENT, repoURL, commitHash);
    }
};

const isCircleCIEnvironment = () => {
    return (process.env[ConfigNames.CIRCLECI_ENV_VAR_NAME]
        || process.env[ConfigNames.CIRCLECI_ENV_VAR_NAME.toLowerCase()] != null);
};

/**
 * Get environment info
 */
export const getEnvironmentInfo = () => {
    return environmentInfo;
};

/**
 * Initiate CircleCI Environment Info
 */
export const init = async (): Promise<void> => {
    try {
        if (environmentInfo == null && isCircleCIEnvironment()) {
            const repoURL = process.env[ConfigNames.CIRCLE_REPOSITORY_URL_ENV_VAR_NAME]
            || process.env[ConfigNames.CIRCLE_BUILD_URL_ENV_VAR_NAME.toLowerCase()];

            const repoName = GitHelper.extractRepoName(repoURL);

            let branch = process.env[ConfigNames.CIRCLE_BRANCH_ENV_VAR_NAME]
            || process.env[ConfigNames.CIRCLE_BRANCH_ENV_VAR_NAME.toLowerCase()];

            let commitHash = process.env[ConfigNames.CIRCLE_SHA1_ENV_VAR_NAME]
            || process.env[ConfigNames.CIRCLE_SHA1_ENV_VAR_NAME.toLowerCase()];

            let commitMessage = '';

            const gitEnvironmentInfo = GitEnvironmentInfo.getEnvironmentInfo();
            if (gitEnvironmentInfo) {
                commitMessage = gitEnvironmentInfo.commitMessage;

                if (!branch) {
                    branch = gitEnvironmentInfo.branch;
                }

                if (!commitHash) {
                    commitHash = gitEnvironmentInfo.commitHash;
                }
            }

            const testRunId = getTestRunId(repoURL, commitHash);

            environmentInfo = new EnvironmentInfo(testRunId, ENVIRONMENT, repoURL, repoName, branch, commitHash, commitMessage);
        }
    } catch (e) {
        ThundraLogger.error(
            '<GithubEnvironmentInfoProvider> Unable to build environment info');
    }
};
