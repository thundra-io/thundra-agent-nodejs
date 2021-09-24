import * as TestRunnerSupport from '../../TestRunnerSupport';
import ForesightWrapperUtils from '../../ForesightWrapperUtils';
import ExecutionContextManager from '../../../../context/ExecutionContextManager';
import TestCaseExecutionContext from '../../context/TestCaseExecutionContext';
import TestSuiteEvent from '../../model/TestSuiteEvent';
import ThundraLogger from '../../../../ThundraLogger';

/**
 * Function for handling test start event
 * @param event event
 */
export default async function run(event: TestSuiteEvent) {

    ThundraLogger.debug(`<TestStart> Handling test start event for test: ${event.testName}`);

    const testName = event.testName;
    const testSuiteName = event.testSuiteName;

    const testCaseId = testSuiteName + '-' + testName;

    const context: TestCaseExecutionContext = ForesightWrapperUtils.createTestCaseExecutionContext(
      TestRunnerSupport.testSuiteName,
      testCaseId,
    );

    ThundraLogger.debug(`<TestStart> New execution context created for test : ${event.testName}`);

    context.name = testName;
    context.method = testName;
    context.testClass = testSuiteName;

    TestRunnerSupport.setTestCaseContext(context);

    ExecutionContextManager.set(context);

    await ForesightWrapperUtils.beforeTestProcess(TestRunnerSupport.wrapperContext.plugins, context);

    ThundraLogger.debug(`<TestStart> Handled test start event for test: ${event.testName}`);
}
