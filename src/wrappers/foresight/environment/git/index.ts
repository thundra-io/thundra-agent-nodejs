import EnvironmentInfo from '../EnvironmentInfo'
import * as GitHelper from './helper';

export const ENVIRONMENT = 'Git';

let environmentInfo: EnvironmentInfo;

/** remove after implementation of getTestRunId*/
import TestRunnerUtils from '../../../../utils/TestRunnerUtils';
/** remove after implementation of  getTestRunId*/

const getTestRunId = (repoURL: string, commitHash: string) => {
    
    /** todo: check config for configuredTestRunId
     *  if exists on config return it
    */

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