import * as TestRunnerSupport from '../../TestRunnerSupport';
import ForesightWrapperUtils from '../../ForesightWrapperUtils';
import ExecutionContextManager from '../../../../context/ExecutionContextManager';
import { TEST_STATUS } from '../../../../Constants';
import TestSuiteEvent from '../../model/TestSuiteEvent';
import HandlerUtils from './utils/HandlerUtils';

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

const isErrorTimeout = (error: Error) => {

  let result = false;
  if (error.message && error.message.toLowerCase().includes('exceeded timeout')) {
    result = true;
  }

  return result;
};

export default async function run(event: TestSuiteEvent) {

    ForesightWrapperUtils.changeAppInfoToTestCase();

    const context = TestRunnerSupport.testCaseExecutionContext;

    let testStatus = TEST_STATUS.SUCCESSFUL;
    if (event.hasError()) {
      testStatus = TEST_STATUS.FAILED;

      const error = event.error;
      context.setError(event.error);

      if (isErrorTimeout(error)) {
        context.setExecutionTimeout(true);
        testStatus = TEST_STATUS.ABORTED;
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
    }

    const testSuiteContext = TestRunnerSupport.testSuiteExecutionContext;

    ExecutionContextManager.set(testSuiteContext);
    ForesightWrapperUtils.changeAppInfoToTestSuite();
}
