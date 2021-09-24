import ExecutionContext from '../../../context/ExecutionContext';
import LogConfig from '../../../plugins/config/LogConfig';
import LogPlugin from '../../../plugins/Log';
import * as TestRunnerSupport from '../TestRunnerSupport';

export default class ForesightLogPlugin extends LogPlugin {

    constructor(options?: LogConfig, consoleReference: any = console) {
        super(options, consoleReference);
    }

    reportLog(logInfo: any, execContext: ExecutionContext, fromConsole: boolean = false): void {

        const context = (TestRunnerSupport.testCaseExecutionContext === execContext
            || TestRunnerSupport.testCaseExecutionContext === execContext.parentContext) ?
            TestRunnerSupport.testCaseExecutionContext : execContext;

        if (this._isSampled()) {
            super.reportLog(logInfo, context, fromConsole);
        }
    }

    protected isSampled(): boolean {

        return true;
    }

    private _isSampled(): boolean {

        return this.getSampler().isSampled();
    }
}
