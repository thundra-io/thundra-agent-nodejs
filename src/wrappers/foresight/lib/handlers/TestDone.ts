import * as TestRunnerSupport from '../../TestRunnerSupport';
import ForesightWrapperUtils from '../../ForesightWrapperUtils';
import ExecutionContextManager from '../../../../context/ExecutionContextManager';
import { TEST_STATUS } from '../../../../Constants';
import TestSuiteEvent from '../../model/TestSuiteEvent';

export default async function run(event: TestSuiteEvent) {

    const orginalEvent = event.orginalEvent;
    if (!orginalEvent){
      
        /**
         * log & return
         */
        return;
    }

    const testEntry = orginalEvent.test;
    if (!testEntry) {
      /**
       * log & return
       */

       return;
    }

    ForesightWrapperUtils.changeAppInfoToTestCase('Jest');

    const context = TestRunnerSupport.testCaseExecutionContext;

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