import { Event, State } from 'jest-circus';

import * as TestRunnerSupport from '../../../TestRunnerSupport';
import ForesightWrapperUtils from '../../../ForesightWrapperUtils';
import ExecutionContextManager from '../../../../../context/ExecutionContextManager';
import TestCaseExecutionContext from '../../../model/TestCaseExecutionContext';
import { TEST_STATUS } from '../../../../../Constants';

export default async function run(event: Event, state: State) {

    ForesightWrapperUtils.changeAppInfoToTestCase('Jest');

    const context = TestRunnerSupport.testCaseExecutionContext;
    context.setStatus(TEST_STATUS.SKIPPED)

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
    ForesightWrapperUtils.changeAppInfoToTestSuite('Jest');
}