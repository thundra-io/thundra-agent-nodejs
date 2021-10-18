import ConfigProvider from '../../../../config/ConfigProvider';
import ConfigNames from '../../../../config/ConfigNames';
import EnvironmentInfo from '../../model/EnvironmentInfo';
import TestRunnerUtils from '../../../../utils/TestRunnerUtils';
import ThundraLogger from '../../../../ThundraLogger';
import * as GitHelper from '../git/helper';
import * as GitEnvironmentInfo from '../git';

export const ENVIRONMENT = 'TravisCI';

let environmentInfo: EnvironmentInfo;

const getTestRunId = (repoURL: string, commitHash: string) => {

    const testRunId = ConfigProvider.get<string>(ConfigNames.THUNDRA_AGENT_TEST_RUN_ID);
    if (testRunId) {
        return testRunId;
    }

    const buildWebURL = process.env[ConfigNames.TRAVIS_BUILD_WEB_URL_ENV_VAR_NAME]
        || process.env[ConfigNames.TRAVIS_BUILD_WEB_URL_ENV_VAR_NAME.toLowerCase()];
    const buildID = process.env[ConfigNames.TRAVIS_BUILD_ID_ENV_VAR_NAME]
        || process.env[ConfigNames.TRAVIS_BUILD_ID_ENV_VAR_NAME.toLowerCase()];

    if (buildWebURL || buildID) {
        return TestRunnerUtils.getTestRunId(ENVIRONMENT, repoURL, commitHash, buildWebURL + '_' + buildID);
    } else {
        return TestRunnerUtils.getDefaultTestRunId(ENVIRONMENT, repoURL, commitHash);
    }
};

const isTravisCIEnvironment = () => {
    return (process.env[ConfigNames.TRAVIS_ENV_VAR_NAME]
        || process.env[ConfigNames.TRAVIS_ENV_VAR_NAME.toLowerCase()] != null);
};

/**
 * Get environment info
 */
export const getEnvironmentInfo = () => {

    return environmentInfo;
};

/**
 * Initiate TravisCI Environment Info
 */
export const init = async (): Promise<void> => {
    try {
        if (environmentInfo == null && isTravisCIEnvironment()) {

            const travisRepoSlug = process.env[ConfigNames.TRAVIS_REPO_SLUG_VAR_NAME]
                || process.env[ConfigNames.TRAVIS_REPO_SLUG_VAR_NAME.toLowerCase()];

            const repoURL = `https://github.com/${travisRepoSlug}.git`;

            const repoName = GitHelper.extractRepoName(repoURL);

            let branch = process.env[ConfigNames.TRAVIS_PULL_REQUEST_BRANCH_ENV_VAR_NAME]
                || process.env[ConfigNames.TRAVIS_PULL_REQUEST_BRANCH_ENV_VAR_NAME.toLowerCase()];

            if (!branch) {
                branch = process.env[ConfigNames.TRAVIS_BRANCH_ENV_VAR_NAME]
                    || process.env[ConfigNames.TRAVIS_BRANCH_ENV_VAR_NAME.toLowerCase()];
            }

            let commitHash = process.env[ConfigNames.TRAVIS_COMMIT_ENV_VAR_NAME]
                || process.env[ConfigNames.TRAVIS_COMMIT_ENV_VAR_NAME.toLowerCase()];

            let commitMessage = process.env[ConfigNames.TRAVIS_COMMIT_MESSAGE_ENV_VAR_NAME]
                || process.env[ConfigNames.TRAVIS_COMMIT_MESSAGE_ENV_VAR_NAME.toLowerCase()];

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
