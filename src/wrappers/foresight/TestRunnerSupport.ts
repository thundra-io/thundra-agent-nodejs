import * as EnvironmentSupport from './environment/EnvironmentSupport';
import EnvironmentInfo from './environment/EnvironmentInfo';
import Utils from '../../utils/Utils';
import TestRunStart from './model/TestRunStart';
import TestRunFinish from './model/TestRunFinish';
import TestRunResult from './model/TestRunResult';
import TestSuiteExecutionContext from './model/TestSuiteExecutionContext';
import TestRunScope, { TestRunContext } from './model/TestRunScope';
import TestCaseScope from './model/TestCaseScope';
import TestCaseExecutionContext from './model/TestCaseExecutionContext';
import os from 'os';

const findHostName = () => {
    return os.hostname;
}

const getTestRunId = () => {
    let testRunId: string;
    const ei: EnvironmentInfo = EnvironmentSupport.getEnvironmentInfo();
    if (ei != null){
        testRunId = ei.testRunId;
    } else {
        testRunId = Utils.generateId();
    }

    return testRunId;
}

export let initialized: boolean = false;
const hostName: string = findHostName();

export let testRunScope: TestRunScope;
export const testSuiteContextMap = new Map<string, TestSuiteExecutionContext>();
export const testCaseScopeMap = new Map<string, TestCaseExecutionContext>();

export const getTestCaseContext = (id: string) => {
    return testCaseScopeMap.get(id);
}

export const putTestCaseContext = (id: string, context: TestCaseExecutionContext) => {
    return testCaseScopeMap.set(id, context);
}

export const removeTestCaseContext = (id: string) => {
    return testCaseScopeMap.delete(id);
}

export const startTestRun = (): TestRunStart => {
    if (initialized){
        // todo: log & and return;

        return;
    }

    const testRunId = getTestRunId();
    const taskId = Utils.generateId();
    const startTimestamp = new Date().getTime();

    testRunScope = new TestRunScope(
        testRunId,
        taskId,
        startTimestamp,
        new TestRunContext()
    );

    initialized = true;

    return TestRunStart
        .builder()
            .withId(testRunId)
            .withProjectId('76cc8cde-f412-4e0f-892a-97e4b7a5fa36') // todo: get from config
            .withTaskId(taskId)
            .withStartTimestamp(startTimestamp)
            .withHostName(hostName)
            .withEnvironmentInfo(EnvironmentSupport.getEnvironmentInfo())
        .build();
}

export const finishTestRun = (testRunResult: TestRunResult): TestRunFinish => {
    if (initialized){
        // todo: log & and return;

        const finishTimestamp = new Date().getTime();

        return TestRunFinish.
            builder()
                .withId(testRunScope.id)
                .withProjectId('76cc8cde-f412-4e0f-892a-97e4b7a5fa36')
                .withTaskId(testRunScope.taskId)
                .withStartTimestamp(testRunScope.startTimestamp)
                .withFinishTimestamp(finishTimestamp)
                .withDuration(finishTimestamp - testRunScope.startTimestamp)
                .withTotalCount(testRunResult.totalCount)
                .withSuccessfulCount(testRunResult.successfulCount)
                .withFailedCount(testRunResult.failedCount)
                .withIgnoredCount(testRunResult.ignoredCount)
                .withAbortedCount(testRunResult.abortedCount)
                .withHostName(hostName)
                .withEnvironmentInfo(EnvironmentSupport.getEnvironmentInfo())
            .build();
    }
}

