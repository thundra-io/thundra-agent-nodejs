import InvocationData from '../../../plugins/data/invocation/InvocationData';
import ThundraSpan from '../../../opentracing/Span';
import EnvironmentInfo from '../model/EnvironmentInfo';
import { TestRunnerTags } from '../model/TestRunnerTags';

import * as InfoProvider from './';
import ThundraLogger from '../../../ThundraLogger';

let environmentInfo: EnvironmentInfo;

/**
 * Initiate all environment providers and set non empty one
 */
export const init = async () => {
    ThundraLogger.debug('<EnvironmentSupport> Environments initilizing ...');

    await InfoProvider.init();

    Object.values(InfoProvider.environmentInfoProviders).forEach((environmentInfoProvider) => {
        const ei: EnvironmentInfo = environmentInfoProvider.getEnvironmentInfo();
        if (ei != null) {
            ThundraLogger.debug(`<EnvironmentSupport> Environment loaded. ${ei.environment}`);
            environmentInfo = ei;
            return;
        }
    });
};

/**
 * Get environment info
 */
export const getEnvironmentInfo = () => {
    return environmentInfo;
};

/**
 * Add environment information to invocation data as tag
 * @param invocationData invocationData
 */
export const tagInvocation = (invocationData: InvocationData) => {
    if (environmentInfo) {
        invocationData.tags[TestRunnerTags.TEST_ENVIRONMENT] = environmentInfo.environment;
        invocationData.tags[TestRunnerTags.SOURCE_CODE_REPO_URL] = environmentInfo.repoURL;
        invocationData.tags[TestRunnerTags.SOURCE_CODE_REPO_NAME] = environmentInfo.repoName;
        invocationData.tags[TestRunnerTags.SOURCE_CODE_BRANCH] = environmentInfo.branch;
        invocationData.tags[TestRunnerTags.SOURCE_CODE_COMMIT_HASH] = environmentInfo.commitHash;
        invocationData.tags[TestRunnerTags.SOURCE_CODE_COMMIT_MESSAGE] = environmentInfo.commitMessage;
    }
};

/**
 * Add environment information to span data as tag
 * @param span span
 */
export const tagSpan = (span: ThundraSpan) => {
    if (environmentInfo) {
        span.tags[TestRunnerTags.TEST_ENVIRONMENT] = environmentInfo.environment;
        span.tags[TestRunnerTags.SOURCE_CODE_REPO_URL] = environmentInfo.repoURL;
        span.tags[TestRunnerTags.SOURCE_CODE_REPO_NAME] = environmentInfo.repoName;
        span.tags[TestRunnerTags.SOURCE_CODE_BRANCH] = environmentInfo.branch;
        span.tags[TestRunnerTags.SOURCE_CODE_COMMIT_HASH] = environmentInfo.commitHash;
        span.tags[TestRunnerTags.SOURCE_CODE_COMMIT_MESSAGE] = environmentInfo.commitMessage;
    }
};
