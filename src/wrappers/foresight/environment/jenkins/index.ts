import ConfigProvider from '../../../../config/ConfigProvider';
import ConfigNames from '../../../../config/ConfigNames';
import EnvironmentInfo from '../../model/EnvironmentInfo';
import TestRunnerUtils from '../../../../utils/TestRunnerUtils';
import ThundraLogger from '../../../../ThundraLogger';
import * as GitHelper from '../git/helper';
import * as GitEnvironmentInfo from '../git';

export const ENVIRONMENT = 'Jenkins';

let environmentInfo: EnvironmentInfo;

const getTestRunId = (repoURL: string, commitHash: string) => {

    const testRunId = ConfigProvider.get<string>(ConfigNames.THUNDRA_AGENT_TEST_RUN_ID);
    if (testRunId) {
        return testRunId;
    }

    const jobName = process.env[ConfigNames.JOB_NAME_ENV_VAR_NAME]
        || process.env[ConfigNames.JOB_NAME_ENV_VAR_NAME.toLowerCase()];
    const buildId = process.env[ConfigNames.BUILD_ID_ENV_VAR_NAME]
        || process.env[ConfigNames.BUILD_ID_ENV_VAR_NAME.toLowerCase()];

    if (jobName || buildId) {
        return TestRunnerUtils.getTestRunId(ENVIRONMENT, repoURL, commitHash, jobName + '_' + buildId);
    } else {
        return TestRunnerUtils.getDefaultTestRunId(ENVIRONMENT, repoURL, commitHash);
    }
};

const isJenkinsEnvironment = () => {
    return (process.env[ConfigNames.JENKINS_HOME_ENV_VAR_NAME]
        || process.env[ConfigNames.JENKINS_HOME_ENV_VAR_NAME.toLowerCase()] != null);
};

export const getEnvironmentInfo = () => {

    return environmentInfo;
};

export const init = async (): Promise<void> => {
    try {
        if (environmentInfo == null && isJenkinsEnvironment()) {

            let repoURL = process.env[ConfigNames.GIT_URL_ENV_VAR_NAME]
                || process.env[ConfigNames.GIT_URL_ENV_VAR_NAME.toLowerCase()];

            if (repoURL) {
                repoURL = process.env[ConfigNames.GIT_URL_1_ENV_VAR_NAME]
                    || process.env[ConfigNames.GIT_URL_1_ENV_VAR_NAME.toLowerCase()];
            }

            const repoName = GitHelper.extractRepoName(repoURL);

            let branch = process.env[ConfigNames.GIT_BRANCH_ENV_VAR_NAME]
                || process.env[ConfigNames.GIT_BRANCH_ENV_VAR_NAME.toLowerCase()];

            let commitHash = process.env[ConfigNames.GIT_COMMIT_ENV_VAR_NAME]
                || process.env[ConfigNames.GIT_COMMIT_ENV_VAR_NAME.toLowerCase()];

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
