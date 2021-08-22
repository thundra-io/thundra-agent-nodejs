import { Event, State } from 'jest-circus';

import * as TestRunnerSupport from '../../../TestRunnerSupport';
import ForesightWrapperUtils from '../../../ForesightWrapperUtils';
import ExecutionContextManager from '../../../../../context/ExecutionContextManager';
import TestCaseExecutionContext from '../../../model/TestCaseExecutionContext';

export default async function run(event: any, state: State) {

    const testEntry = event.test;
    if (!testEntry || !testEntry.parent){
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