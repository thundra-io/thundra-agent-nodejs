import Path from 'path';

import Utils from './Utils';
import { KNOWN_TEST_FILE_PATHS } from '../Constants';

/**
 * Util class for test run process
 */
class TestRunnerUtils {

    private constructor() {
    }

    /**
     * Generate and return test run id
     * @param environment environment
     * @param repoURL repoURL
     * @param commitHash commitHash
     * @param testRunKey testRunKey
     */
    static getTestRunId(
        environment: string,
        repoURL: string,
        commitHash: string,
        testRunKey: string) {

        const testRunIdSeed = environment + '_' + repoURL + '_' + commitHash + '_' + testRunKey;

        return Utils.generareIdFrom(testRunIdSeed);
    }

    /**
     * Generate and return test run id according to default behaviour
     * @param environment environment
     * @param repoURL repoURL
     * @param commitHash commitHash
     */
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
                runId,
            );
    }

    /**
     * Generate and return test file name
     * @param testPath testPath
     * @param rootDir rootDir
     */
    static getTestFileName(testPath: string, rootDir: string) {

        const relativePath = testPath.replace(
            rootDir.endsWith('/')
            ? rootDir
            : rootDir + '/', '')
            .split('/');

        if (relativePath.length > 1 && KNOWN_TEST_FILE_PATHS.has(relativePath[0].toLowerCase())) {
            relativePath.shift();

            return Path.join(...relativePath);
        }

        return relativePath.pop();
    }
}

export default TestRunnerUtils;
