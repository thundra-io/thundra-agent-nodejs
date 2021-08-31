import * as EnvironmentSupport from './environment/EnvironmentSupport';
import EnvironmentInfo from './environment/EnvironmentInfo';
import Utils from '../../utils/Utils';
import TestRunStart from './model/TestRunStart';
import TestRunFinish from './model/TestRunFinish';
import TestSuiteExecutionContext from './model/TestSuiteExecutionContext';
import TestRunScope, { TestRunContext } from './model/TestRunScope';
import TestCaseExecutionContext from './model/TestCaseExecutionContext';
import os from 'os';
import ExecutionContext from '../../context/ExecutionContext';
import WrapperContext from '../WrapperContext';
import TestRunStatus from './model/TestRunStatus';
import ConfigProvider from '../../config/ConfigProvider';
import ConfigNames from '../../config/ConfigNames';

const findHostName = () => {
    return os.hostname();
};

const getTestRunId = () => {
    let testRunId: string;
    const ei: EnvironmentInfo = EnvironmentSupport.getEnvironmentInfo();
    if (ei != null) {
        testRunId = ei.testRunId;
    } else {
        testRunId = Utils.generateId();
    }

    return testRunId;
};

const hostName: string = findHostName();
let projectId: string;
let testStatusReportFreq: number;
let testRunStatusWork: NodeJS.Timeout;

export let testSuiteName: string;
export let wrapperContext: WrapperContext;
export let initialized: boolean = false;
export let testRunScope: TestRunScope;
export let testSuiteExecutionContext: TestSuiteExecutionContext;
export let testCaseExecutionContext: TestCaseExecutionContext;

export const setProjectId = (id: string) => {
    projectId = id;
};

export const setTestSuiteName = (name: string) => {
    testSuiteName = name;
};

export const setWrapperContext = (context: WrapperContext) => {
    wrapperContext = context;
};

export const setInitialized = (value: boolean) => {
    initialized = value;
};

export const setTestSuiteContext = (context: ExecutionContext) => {
    testSuiteExecutionContext = context as TestSuiteExecutionContext;
};

export const setTestCaseContext = (context: ExecutionContext) => {
    testCaseExecutionContext = context as TestCaseExecutionContext;
};

export const setTestStatusReportFreq = (freq: number) => {
    testStatusReportFreq = freq;
};

/** if needed keep suite and cases contexts in here
    export const testSuiteContextMap = new Map<string, TestSuiteExecutionContext>();
    export const testCaseScopeMap = new Map<string, TestCaseExecutionContext>();
*/

const sendTestRunStatus = async () => {
    if (!testRunScope || !initialized) {
        /**
         * log & return
         */

        return;
    }

    const config = ConfigProvider.thundraConfig;
    const { apiKey } = config;

    const statusTimestamp = new Date().getTime();
    const testRunStatus = TestRunStatus
        .builder()
            .withId(testRunScope.id)
            .withProjectId(projectId)
            .withTaskId(testRunScope.taskId)
            .withStartTimestamp(testRunScope.startTimestamp)
            .withStatusTimestamp(statusTimestamp)
            .withTotalCount(testRunScope.context.totalCount)
            .withSuccessfulCount(testRunScope.context.successfulCount)
            .withFailedCount(testRunScope.context.failedCount)
            .withIgnoredCount(testRunScope.context.ignoredCount)
            .withAbortedCount(testRunScope.context.abortedCount)
            .withHostName(hostName)
            .withEnvironmentInfo(EnvironmentSupport.getEnvironmentInfo())
        .build();

    await wrapperContext.reporter.sendReports([Utils.generateReport(testRunStatus, apiKey)]);
    startTestRunStatusEvent();
};

export const startTestRunStatusEvent = () => {

    if (testStatusReportFreq) {
        finishTestRunStatusEvent();
        testRunStatusWork = setTimeout(sendTestRunStatus, testStatusReportFreq);
    }
};

export const finishTestRunStatusEvent = () => {
    clearInterval(testRunStatusWork);
};

export const startTestRun = (): TestRunStart => {

    const testRunId = getTestRunId();
    const taskId = Utils.generateId();
    const startTimestamp = new Date().getTime();

    testRunScope = new TestRunScope(
        testRunId,
        taskId,
        startTimestamp,
        new TestRunContext(),
    );

    initialized = true;

    return TestRunStart
        .builder()
            .withId(testRunId)
            .withProjectId(projectId)
            .withTaskId(taskId)
            .withStartTimestamp(startTimestamp)
            .withHostName(hostName)
            .withEnvironmentInfo(EnvironmentSupport.getEnvironmentInfo())
        .build();
};

export const finishTestRun = (): TestRunFinish => {
    if (!initialized || !testRunScope) {
        // todo: log & and return;
        return;
    }

    const finishTimestamp = new Date().getTime();

    const {
        totalCount,
        successfulCount,
        failedCount,
        ignoredCount,
        abortedCount,
    } = testRunScope.context;

    return TestRunFinish.
        builder()
            .withId(testRunScope.id)
            .withProjectId(projectId)
            .withTaskId(testRunScope.taskId)
            .withStartTimestamp(testRunScope.startTimestamp)
            .withFinishTimestamp(finishTimestamp)
            .withDuration(finishTimestamp - testRunScope.startTimestamp)
            .withTotalCount(totalCount)
            .withSuccessfulCount(successfulCount)
            .withFailedCount(failedCount)
            .withIgnoredCount(ignoredCount)
            .withAbortedCount(abortedCount)
            .withHostName(hostName)
            .withEnvironmentInfo(EnvironmentSupport.getEnvironmentInfo())
        .build();
};
