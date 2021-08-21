import Utils from './Utils';

class TestRunnerUtils {

    private constructor() {
    }

    static getTestRunId(
        environment: string,
        repoURL: string,
        commitHash: string,
        testRunKey: string) {
        const testRunIdSeed = environment + "_" + repoURL + "_" + commitHash + "_" + testRunKey;
        return Utils.generareIdFrom(testRunIdSeed);
    }

    static getDefaultTestRunId(    
        environment: string,
        repoURL: string,
        commitHash: string) {

            /** todo: generate more unique id from parente process ? */
            const runId = process.ppid + '_';

            return TestRunnerUtils.getTestRunId(
                environment,
                repoURL,
                commitHash,
                runId
            );
    }
}

export default TestRunnerUtils;