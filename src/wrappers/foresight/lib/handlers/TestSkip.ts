import * as TestRunnerSupport from '../../TestRunnerSupport';
import ForesightWrapperUtils from '../../ForesightWrapperUtils';
import ExecutionContextManager from '../../../../context/ExecutionContextManager';
import { TEST_STATUS } from '../../../../Constants';
import TestSuiteEvent from '../../model/TestSuiteEvent';

export default async function run(event: TestSuiteEvent) {

    ForesightWrapperUtils.changeAppInfoToTestCase();

    const context = TestRunnerSupport.testCaseExecutionContext;
    context.setStatus(TEST_STATUS.SKIPPED);

    ExecutionContextManager.set(context);

    /**
     * todo: handle test error state in here and set test status info
     * according to status increase test counts
     */

    await ForesightWrapperUtils.afterTestProcess(
      TestRunnerSupport.wrapperContext.plugins,
      context,
      TestRunnerSupport.wrapperContext.reporter);

    const testRunContext = TestRunnerSupport.testRunScope;
    const testSuiteContext = TestRunnerSupport.testSuiteExecutionContext;

    testSuiteContext.increaseSkippedCount();
    testRunContext.increaseIgnoredCount();

    ExecutionContextManager.set(testSuiteContext);
    ForesightWrapperUtils.changeAppInfoToTestSuite();
}
