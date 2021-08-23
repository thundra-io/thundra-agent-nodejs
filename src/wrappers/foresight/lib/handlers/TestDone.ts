import * as TestRunnerSupport from '../../TestRunnerSupport';
import ForesightWrapperUtils from '../../ForesightWrapperUtils';
import ExecutionContextManager from '../../../../context/ExecutionContextManager';
import { TEST_STATUS } from '../../../../Constants';
import TestSuiteEvent from '../../model/TestSuiteEvent';

const isErrorTimeout = (error: Error) => {

  let result = false;
  if (error.message && error.message.toLowerCase().includes('exceeded timeout')) {
    result = true;
  }

  return result;
}

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

    ForesightWrapperUtils.changeAppInfoToTestCase();

    const context = TestRunnerSupport.testCaseExecutionContext;

    let testStatus = TEST_STATUS.SUCCESSFUL;
    const errorArr = testEntry.errors;
    if (errorArr.length) {
      testStatus = TEST_STATUS.FAILED;

      const error: Error = testEntry.asyncError ? testEntry.asyncError : new Error(errorArr[0]);
      context.setError(error);

      if (isErrorTimeout(error)) {
        context.setExecutionTimeout(true);
      }
    }

    context.setStatus(testStatus);

    ExecutionContextManager.set(context);

    await ForesightWrapperUtils.afterTestProcess(
      TestRunnerSupport.wrapperContext.plugins,
      context,
      TestRunnerSupport.wrapperContext.reporter);

    const testRunContext = TestRunnerSupport.testRunScope;
    const testSuiteContext = TestRunnerSupport.testSuiteExecutionContext;

    if (testStatus === TEST_STATUS.SUCCESSFUL) {
      testSuiteContext.increareSuccessfulCount();
      testRunContext.increareSuccessfulCount();
    } else {
      testSuiteContext.increaseFailedCount();
      testRunContext.increaseFailedCount();
    }

    ExecutionContextManager.set(testSuiteContext);
    ForesightWrapperUtils.changeAppInfoToTestSuite();
}