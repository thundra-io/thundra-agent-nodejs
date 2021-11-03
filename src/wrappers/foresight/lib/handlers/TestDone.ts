import * as TestRunnerSupport from '../../TestRunnerSupport';
import ForesightWrapperUtils from '../../ForesightWrapperUtils';
import ExecutionContextManager from '../../../../context/ExecutionContextManager';
import { TEST_STATUS } from '../../../../Constants';
import TestSuiteEvent from '../../model/TestSuiteEvent';
import ThundraLogger from '../../../../ThundraLogger';

const increareSuccessfulCount = () => {
    const testRunContext = TestRunnerSupport.testRunScope;
    const testSuiteContext = TestRunnerSupport.testSuiteExecutionContext;

    testSuiteContext.increareSuccessfulCount();
    testRunContext.increareSuccessfulCount();
};

const increaseFailedCount = () => {
    const testRunContext = TestRunnerSupport.testRunScope;
    const testSuiteContext = TestRunnerSupport.testSuiteExecutionContext;

    testSuiteContext.increaseFailedCount();
    testRunContext.increaseFailedCount();
};

const increaseAbortedCount = () => {
    const testRunContext = TestRunnerSupport.testRunScope;
    const testSuiteContext = TestRunnerSupport.testSuiteExecutionContext;

    testSuiteContext.increaseAbortedCount();
    testRunContext.increaseAbortedCount();
};

const increaseActions = {
    [TEST_STATUS.SUCCESSFUL]: increareSuccessfulCount,
    [TEST_STATUS.FAILED]: increaseFailedCount,
    [TEST_STATUS.ABORTED]: increaseAbortedCount,
};

/**
 * Function for handling test done event
 * @param event event
 */
export default async function run(event: TestSuiteEvent) {
    ThundraLogger.debug(`<TestDone> Handling test done event for test: ${event.testName}`);

    const context = TestRunnerSupport.testCaseExecutionContext;

    let testStatus = TEST_STATUS.SUCCESSFUL;
    if (event.hasError()) {
        testStatus = TEST_STATUS.FAILED;

        context.setError(event.error);

        if (event.isTimeout()) {
            context.setExecutionTimeout(true);
            testStatus = TEST_STATUS.ABORTED;

            ThundraLogger.debug(`<TestDone> Timeout information added to context for test: ${event.testName}`);
        }
    }

    context.setStatus(testStatus);

    ExecutionContextManager.set(context);

    await ForesightWrapperUtils.afterTestProcess(
        TestRunnerSupport.wrapperContext.plugins,
        context,
        TestRunnerSupport.wrapperContext.reporter);

    const increaseAction = increaseActions[testStatus];
    if (increaseAction) {
        increaseAction();

        ThundraLogger.debug(`<TestDone> Counts of test increased for test: ${event.testName}`);
    }

    ThundraLogger.debug(`
      <TestDone> Handled test done event for test: ${event.testName}.
      Test status is ${testStatus}
    `);

    const testSuiteContext = TestRunnerSupport.testSuiteExecutionContext;

    ExecutionContextManager.set(testSuiteContext);

    ThundraLogger.debug('<TestDone> Execution context switched to testsute.');

    TestRunnerSupport.setTestCaseContext(null);

    ThundraLogger.debug('<TestDone> Test execution context removed.');
}
