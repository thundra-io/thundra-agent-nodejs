import * as TestRunnerSupport from '../../TestRunnerSupport';
import ForesightWrapperUtils from '../../ForesightWrapperUtils';
import * as EnvironmentSupport from '../../environment/EnvironmentSupport';
import ExecutionContextManager from '../../../../context/ExecutionContextManager';
import TestSuiteExecutionContext from '../../model/TestSuiteExecutionContext';
import TestSuiteEvent from '../../model/TestSuiteEvent';
import Utils from '../../../../utils/Utils';
import ConfigProvider from '../../../../config/ConfigProvider';
import ThundraLogger from '../../../../ThundraLogger';

async function sendData(data: any) {

    const config = ConfigProvider.thundraConfig;
    const { apiKey } = config;

    const { reporter } = TestRunnerSupport.wrapperContext;

    await reporter.sendReports([Utils.generateReport(data, apiKey)]);
}

async function globalSetup() {

    ThundraLogger.debug(`<Setup> Global setup creating for test suite: ${TestRunnerSupport.testSuiteName}.`);

    await EnvironmentSupport.init();

    const testRunStart = TestRunnerSupport.startTestRun();
    if (!testRunStart) {
        return;
    }

    try {

        await sendData(testRunStart);
        ThundraLogger.debug(`
            <Setup> Test run start event sended for test suite: ${TestRunnerSupport.testSuiteName}
            with test run id: ${testRunStart.id}
        `);
    } catch (error) {

        ThundraLogger.error('<Setup> Test run start event did not send.', error);
    } finally {

        TestRunnerSupport.startTestRunStatusEvent();
        ThundraLogger.debug('<Setup> Test run status event interval started');
    }
}

async function globalTeardown() {

    ThundraLogger.debug(`<Setup> Global teardown creating for test suite: ${TestRunnerSupport.testSuiteName}.`);

    async function exitHandler(evtOrExitCodeOrError: number | string | Error) {

        ThundraLogger.debug(`<Setup> Test run fisining with code ${evtOrExitCodeOrError}.`);

        try {

            const testRunFinish = TestRunnerSupport.finishTestRun();
            if (!testRunFinish) {
                return;
            }

            await sendData(testRunFinish);
            ThundraLogger.debug(`
                <Setup> Test run start event sended for test suite: ${TestRunnerSupport.testSuiteName}
                with test run id: ${testRunFinish.id}
            `);

            TestRunnerSupport.setInitialized(false);
            TestRunnerSupport.finishTestRunStatusEvent();

            ThundraLogger.debug('<Setup> Test run status event interval stopped.');
        } catch (error) {

            ThundraLogger.error('<Setup> Test run finish event did not send.', error);
        }

        process.exit(isNaN(+evtOrExitCodeOrError) ? 1 : +evtOrExitCodeOrError);
    }

    [
        'beforeExit', 'uncaughtException', 'unhandledRejection',
        'SIGHUP', 'SIGINT', 'SIGQUIT', 'SIGILL', 'SIGTRAP',
        'SIGABRT', 'SIGBUS', 'SIGFPE', 'SIGUSR1', 'SIGSEGV',
        'SIGUSR2', 'SIGTERM',
    ].forEach((evt) => process.on(evt, exitHandler));
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

    ForesightWrapperUtils.changeAppInfoToTestSuite();
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
