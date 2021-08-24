import EnvironmentInfo from '../EnvironmentInfo'
import * as GitHelper from './helper';
import TestRunnerUtils from '../../../../utils/TestRunnerUtils';
import ConfigNames from '../../../../config/ConfigNames';
import ConfigProvider from '../../../../config/ConfigProvider';

export const ENVIRONMENT = 'Git';

let environmentInfo: EnvironmentInfo;

const getTestRunId = (repoURL: string, commitHash: string) => {
    
    const testRunId = ConfigProvider.get<string>(ConfigNames.THUNDRA_AGENT_TEST_RUN_ID);
    if (testRunId) {
        return testRunId;
    }

    return TestRunnerUtils.getDefaultTestRunId(ENVIRONMENT, repoURL, commitHash);
}

export const getEnvironmentInfo = () => {

    return environmentInfo;
}

export const init = async () => {
    if (environmentInfo == null){
        // todo: obtain required fields in here

        const gitEnvironmentInfo = await GitHelper.init();
        if (gitEnvironmentInfo != null) {
            
            const repoURL = gitEnvironmentInfo.repoURL;
            const repoName = gitEnvironmentInfo.repoName;
            const branch = gitEnvironmentInfo.branch;
            const commitHash = gitEnvironmentInfo.commitHash;
            const commitMessage = gitEnvironmentInfo.commitMessage;

            const testRunId = getTestRunId(repoURL, commitHash);

            environmentInfo = new EnvironmentInfo(
                testRunId, 
                ENVIRONMENT, 
                repoURL, 
                repoName, 
                branch, 
                commitHash, 
                commitMessage);
        }
    }
}