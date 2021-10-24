import * as TestRunnerSupport from '../../TestRunnerSupport';
import ForesightWrapperUtils from '../../ForesightWrapperUtils';
import ExecutionContextManager from '../../../../context/ExecutionContextManager';
import TestSuiteEvent from '../../model/TestSuiteEvent';
import ThundraLogger from '../../../../ThundraLogger';
import HandlerUtils from './utils/HandlerUtils';

/**
 * Function for handling teardown event
 * @param event event
 */
export default async function run(event: TestSuiteEvent) {
    ThundraLogger.debug(`<Teardown> Handling teardown event for test: ${TestRunnerSupport.testSuiteName}`);

    const context = TestRunnerSupport.testSuiteExecutionContext;
    ExecutionContextManager.set(context);

    await ForesightWrapperUtils.afterTestProcess(
        TestRunnerSupport.wrapperContext.plugins,
        context,
        TestRunnerSupport.wrapperContext.reporter);

    ThundraLogger.debug(`<Teardown> Handled teardown event for test: ${TestRunnerSupport.testSuiteName}`);

    await HandlerUtils.sendTestRunFinish();
}
