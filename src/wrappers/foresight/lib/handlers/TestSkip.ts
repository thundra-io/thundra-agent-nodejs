import * as TestRunnerSupport from '../../TestRunnerSupport';
import ForesightWrapperUtils from '../../ForesightWrapperUtils';
import ExecutionContextManager from '../../../../context/ExecutionContextManager';
import { TEST_STATUS } from '../../../../Constants';
import TestSuiteEvent from '../../model/TestSuiteEvent';
import ThundraLogger from '../../../../ThundraLogger';

/**
 * Function for handling test skip event
 * @param event event
 */
export default async function run(event: TestSuiteEvent) {
    ThundraLogger.debug(`<TestSkip> Handling test skip event for test: ${event.testName}`);

    const context = TestRunnerSupport.testCaseExecutionContext;
    context.setStatus(TEST_STATUS.SKIPPED);

    ExecutionContextManager.set(context);

    await ForesightWrapperUtils.afterTestProcess(
        TestRunnerSupport.wrapperContext.plugins,
        context,
        TestRunnerSupport.wrapperContext.reporter);

    const testRunContext = TestRunnerSupport.testRunScope;
    const testSuiteContext = TestRunnerSupport.testSuiteExecutionContext;

    testSuiteContext.increaseSkippedCount();
    testRunContext.increaseIgnoredCount();

    ThundraLogger.debug(`<TestSkip> Handled test skip event for test: ${event.testName}`);

    ExecutionContextManager.set(testSuiteContext);

    ThundraLogger.debug('<TestSkip> Execution context switched to testsute.');
}
