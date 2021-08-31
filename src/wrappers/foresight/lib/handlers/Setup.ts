import * as TestRunnerSupport from '../../TestRunnerSupport';
import ForesightWrapperUtils from '../../ForesightWrapperUtils';
import * as EnvironmentSupport from '../../environment/EnvironmentSupport';
import ExecutionContextManager from '../../../../context/ExecutionContextManager';
import TestSuiteExecutionContext from '../../model/TestSuiteExecutionContext';
import TestSuiteEvent from '../../model/TestSuiteEvent';
import Utils from '../../../../utils/Utils';
import ConfigProvider from '../../../../config/ConfigProvider';

async function sendData(data: any) {

    const config = ConfigProvider.thundraConfig;
    const { apiKey } = config;

    const { reporter } = TestRunnerSupport.wrapperContext;

    await reporter.sendReports([Utils.generateReport(data, apiKey)]);
}

async function globalSetup() {

    await EnvironmentSupport.init();

    const testRunStart = TestRunnerSupport.startTestRun();
    if (!testRunStart) {
        return;
    }

    console.log({
        testRunId: testRunStart.id,
    });

    try {

        await sendData(testRunStart);
        TestRunnerSupport.startTestRunStatusEvent();
    } catch (error) {
        /**
         * thundra logger error
         */

        console.error(error);
    }
}

async function globalTeardown() {

    async function exitHandler(evtOrExitCodeOrError: number | string | Error) {

        try {

            const testRunFinish = TestRunnerSupport.finishTestRun();
            if (!testRunFinish) {
                return;
            }

            await sendData(testRunFinish);
            TestRunnerSupport.setInitialized(false);
            TestRunnerSupport.finishTestRunStatusEvent();
        } catch (e) {
            /**
             * thundra logger error
             */

            console.error('EXIT HANDLER ERROR', e);
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

export default async function run(event: TestSuiteEvent) {

    await initTestSuite();
    await startTestSuite();
}
