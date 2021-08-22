
import { Event, State } from 'jest-circus';

import * as TestRunnerSupport from '../../../TestRunnerSupport';
import ForesightWrapperUtils from '../../../ForesightWrapperUtils';
import ExecutionContextManager from '../../../../../context/ExecutionContextManager';

export default async function run(event: Event, state: State) {

    ForesightWrapperUtils.changeAppInfoToTestSuite('Jest');
    
    const context = TestRunnerSupport.testSuiteExecutionContext;
    ExecutionContextManager.set(context);

    await ForesightWrapperUtils.afterTestProcess(
      TestRunnerSupport.wrapperContext.plugins,
      context,
      TestRunnerSupport.wrapperContext.reporter);
}