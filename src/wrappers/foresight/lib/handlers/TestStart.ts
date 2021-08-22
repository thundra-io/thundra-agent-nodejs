import * as TestRunnerSupport from '../../TestRunnerSupport';
import ForesightWrapperUtils from '../../ForesightWrapperUtils';
import ExecutionContextManager from '../../../../context/ExecutionContextManager';
import TestCaseExecutionContext from '../../model/TestCaseExecutionContext';
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
    if (!testEntry){

      /**
       * log & return
       */
      return;
  }

    const testName = testEntry.name;
    const testSuiteName = testEntry.parent.name;

    const testCaseId = testSuiteName + '-' + testName;

    ForesightWrapperUtils.changeAppInfoToTestCase('Jest');

    const context: TestCaseExecutionContext = ForesightWrapperUtils.createTestCaseExecutionContext(
      TestRunnerSupport.testSuiteName,
      testCaseId
    ); 

    context.name = testName;
    context.method = testName;
    context.testClass = testSuiteName;

    TestRunnerSupport.setTestCaseContext(context);

    ExecutionContextManager.set(context);

    await ForesightWrapperUtils.beforeTestProcess(TestRunnerSupport.wrapperContext.plugins, context);
}