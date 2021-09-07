import ConfigProvider from '../../../../config/ConfigProvider';
import ConfigNames from '../../../../config/ConfigNames';
import EnvironmentInfo from '../../model/EnvironmentInfo';
import TestRunnerUtils from '../../../../utils/TestRunnerUtils';
import ThundraLogger from '../../../../ThundraLogger';
import * as GitHelper from '../git/helper';
import {extractRepoName} from '../git/helper';
import fs from 'fs';
import util from 'util';

const get = require('lodash.get');

export const ENVIRONMENT = 'Github';
const REFS_HEADS_PREFIX = 'refs/heads/';
let environmentInfo: EnvironmentInfo;

const getTestRunId = (repoURL: string, commitHash: string) => {

    const testRunId = ConfigProvider.get<string>(ConfigNames.THUNDRA_AGENT_TEST_RUN_ID);
    if (testRunId) {
        return testRunId;
    }

    const githubRunId = process.env[ConfigNames.GITHUB_RUN_ID_ENV_VAR_NAME]
        || process.env[ConfigNames.GITHUB_RUN_ID_ENV_VAR_NAME.toLowerCase()];
    if (githubRunId) {
        const invocationId = process.env[ConfigNames.INVOCATION_ID_ENV_VAR_NAME]
            || process.env[ConfigNames.INVOCATION_ID_ENV_VAR_NAME.toLowerCase()];
        return TestRunnerUtils.getTestRunId(ENVIRONMENT, repoURL, commitHash, githubRunId + '_' + invocationId);
    } else {
        return TestRunnerUtils.getDefaultTestRunId(ENVIRONMENT, repoURL, commitHash);
    }
};

export const getEnvironmentInfo = () => {

    return environmentInfo;
};

export const init = async (): Promise<void> => {
    try {
        if (environmentInfo == null) {
            const gitEnvironmentInfo = await GitHelper.init();

            const githubRepo = process.env[ConfigNames.GITHUB_REPOSITORY_ENV_VAR_NAME]
                || process.env[ConfigNames.GITHUB_REPOSITORY_ENV_VAR_NAME.toLowerCase()];
            if (!githubRepo) {
                return null;
            }
            const repoURL = `https://github.com/${githubRepo}.git`;
            const repoName = extractRepoName(githubRepo);
            let branch = process.env[ConfigNames.GITHUB_HEAD_REF_ENV_VAR_NAME]
                || process.env[ConfigNames.GITHUB_HEAD_REF_ENV_VAR_NAME.toLowerCase()];
            let commitHash = process.env[ConfigNames.GITHUB_SHA_ENV_VAR_NAME]
                || process.env[ConfigNames.GITHUB_SHA_ENV_VAR_NAME.toLowerCase()];

            const commitMessage = gitEnvironmentInfo.commitMessage;
            const githubEventPath = process.env[ConfigNames.GITHUB_EVENT_PATH_ENV_VAR_NAME]
                || process.env[ConfigNames.GITHUB_EVENT_PATH_ENV_VAR_NAME.toLowerCase()];
            if (githubEventPath) {
                try {
                    const readFile = util.promisify(fs.readFile);
                    const eventJSON = JSON.parse(await readFile(githubEventPath, 'utf8'));
                    commitHash = get(eventJSON, 'pull_request.head.sha');
                } catch (e) {
                    ThundraLogger.error(`Unable to read GitHub event from file ${githubEventPath}`);
                }
            }

            if (!branch) {
                branch = process.env[ConfigNames.GITHUB_REF_ENV_VAR_NAME]
                    || process.env[ConfigNames.GITHUB_REF_ENV_VAR_NAME.toLowerCase()];
                if (branch && branch.startsWith(REFS_HEADS_PREFIX)) {
                    branch = branch.substring(REFS_HEADS_PREFIX.length);
                }
            }
            if (!branch) {
                branch = gitEnvironmentInfo.branch;
            }

            if (!commitHash) {
                commitHash = gitEnvironmentInfo.commitHash;
            }

            const testRunId = getTestRunId(repoURL, commitHash);

            environmentInfo = new EnvironmentInfo(testRunId, ENVIRONMENT, repoURL, repoName, branch, commitHash, commitMessage);
        }
    } catch (e) {
        ThundraLogger.error(
            `<GithubEnvironmentInfoProvider> Unable to build environment info`);
    }
};
