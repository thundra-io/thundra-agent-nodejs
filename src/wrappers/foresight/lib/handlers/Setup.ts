import * as TestRunnerSupport from '../../TestRunnerSupport';
import ForesightWrapperUtils from '../../ForesightWrapperUtils';
import * as EnvironmentSupport from '../../environment/EnvironmentSupport';
import ExecutionContextManager from '../../../../context/ExecutionContextManager';
import TestSuiteExecutionContext from '../../context/TestSuiteExecutionContext';
import TestSuiteEvent from '../../model/TestSuiteEvent';
import ThundraLogger from '../../../../ThundraLogger';
import HandlerUtils from './utils/HandlerUtils';
import { PROCESS_EXIT_EVENTS } from '../../../../Constants';

async function exitHandler(evtOrExitCodeOrError: number | string | Error) {

    if (TestRunnerSupport.initialized) {

        await HandlerUtils.sendTestRunFinish();
    }
}

async function globalSetup() {

    ThundraLogger.debug(`<Setup> Global setup creating for test suite: ${TestRunnerSupport.testSuiteName}.`);

    await EnvironmentSupport.init();

    await HandlerUtils.sendTestRunStart();
}

async function globalTeardown() {

    ThundraLogger.debug(`<Setup> Global teardown creating for test suite: ${TestRunnerSupport.testSuiteName}.`);

    PROCESS_EXIT_EVENTS.forEach((evt: any) => {

        const exists = process.listeners(evt).some((listener) => listener === exitHandler);
        if (!exists) {

            process.prependOnceListener(evt, exitHandler);
        }
    });
}

async function initTestSuite() {

    if (!TestRunnerSupport.initialized) {

        ThundraLogger.debug(`<Setup> Test suite initializing ...`);

        TestRunnerSupport.setInitialized(true);

        await globalSetup();
        await globalTeardown();
    }
}

async function startTestSuite() {

    const context: TestSuiteExecutionContext = ForesightWrapperUtils
        .createTestSuiteExecutionContext(TestRunnerSupport.testSuiteName);
    TestRunnerSupport.setTestSuiteContext(context);

    ExecutionContextManager.set(context);

    await ForesightWrapperUtils.beforeTestProcess(TestRunnerSupport.wrapperContext.plugins, context);
}

/**
 * Function for handling setup event
 * @param event event
 */
export default async function run(event: TestSuiteEvent) {

    ThundraLogger.debug(`<Setup> Handling test setup event for test suite: ${TestRunnerSupport.testSuiteName}.`);

    await initTestSuite();
    await startTestSuite();
}
