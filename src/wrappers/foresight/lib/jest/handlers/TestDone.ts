import { Event, State } from 'jest-circus';

import * as TestRunnerSupport from '../../../TestRunnerSupport';
import ForesightWrapperUtils from '../../../ForesightWrapperUtils';
import ExecutionContextManager from '../../../../../context/ExecutionContextManager';
import { TEST_STATUS } from '../../../../../Constants';

export default async function run(event: any, state: State) {

    ForesightWrapperUtils.changeAppInfoToTestCase('Jest');

    const context = TestRunnerSupport.testCaseExecutionContext;

    const testEntry = event.test;
    if (!testEntry) {
      /**
       * log & return
       */

       return;
    }

    let testStatus = TEST_STATUS.SUCCESSFUL;
    const errorArr = testEntry.errors;
    if (errorArr.length) {
      testStatus = TEST_STATUS.FAILED;
    }

    context.setStatus(testStatus);

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

    testSuiteContext.increareSuccessfulCount();
    testRunContext.increareSuccessfulCount();

    ExecutionContextManager.set(testSuiteContext);
    ForesightWrapperUtils.changeAppInfoToTestSuite('Jest');
}