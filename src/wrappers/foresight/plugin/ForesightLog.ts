import ExecutionContext from '../../../context/ExecutionContext';
import LogConfig from '../../../plugins/config/LogConfig';
import Log from '../../../plugins/Log';

const get = require('lodash.get');

export default class ForesightLog extends Log {

    constructor(options?: LogConfig, consoleReference: any = console) {
        super(options, consoleReference);
    }

    reportLog(logInfo: any, execContext: ExecutionContext, fromConsole: boolean = false): void {
        if (this._isSampled()) {
            super.reportLog(logInfo, execContext, fromConsole);
        }
    }

    protected isSampled(): boolean {
        return true;
    }

    private _isSampled(): boolean {
        const sampler = get(this.config, 'sampler', { isSampled: () => true });
        return sampler.isSampled();
    }
}
