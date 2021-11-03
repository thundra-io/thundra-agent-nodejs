import HandlerUtils from '../handlers/utils/HandlerUtils';
import { PROCESS_EXIT_EVENTS } from '../../../../Constants';
import ThundraLogger from '../../../../ThundraLogger';
import * as TestRunnerSupport from '../../TestRunnerSupport';

async function exitHandler(evtOrExitCodeOrError: number | string | Error) {

    if (TestRunnerSupport.initialized) {
        await HandlerUtils.sendTestRunFinish();
    }
}

export function subscribeProcessExitEvents() {

    ThundraLogger.debug(`<Setup> Global teardown creating for test suite: ${TestRunnerSupport.testSuiteName}.`);

    PROCESS_EXIT_EVENTS.forEach((evt: any) => {

        const exists = process.listeners(evt).some((listener) => listener === exitHandler);
        if (!exists) {

            process.prependOnceListener(evt, exitHandler);
        }
    });
}
