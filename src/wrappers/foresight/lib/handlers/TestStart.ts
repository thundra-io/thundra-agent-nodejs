import * as TestRunnerSupport from '../../TestRunnerSupport';
import ForesightWrapperUtils from '../../ForesightWrapperUtils';
import ExecutionContextManager from '../../../../context/ExecutionContextManager';
import TestCaseExecutionContext from '../../model/TestCaseExecutionContext';
import TestSuiteEvent from '../../model/TestSuiteEvent';
import HandlerUtils from './utils/HandlerUtils';

export default async function run(event: TestSuiteEvent) {

    const testName = event.testName;
    const testSuiteName = event.testSuiteName;

    const testCaseId = testSuiteName + '-' + testName;

    ForesightWrapperUtils.changeAppInfoToTestCase();

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