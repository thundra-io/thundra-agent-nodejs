import Utils from './plugins/utils/Utils';
import { envVariableKeys } from './Constants';

class ThundraLogger {
    static instance: ThundraLogger;
    enabled: boolean;

    constructor() {
        this.enabled = Utils.getConfiguration(envVariableKeys.THUNDRA_AGENT_LAMBDA_AGENT_DEBUG_ENABLE) === 'true';
        ThundraLogger.instance = this;
    }

    static getInstance(): ThundraLogger {
        return ThundraLogger.instance ? ThundraLogger.instance : new ThundraLogger();
    }

    debug(message: any) {
        if (this.enabled) {
            console.log(message);
        }
    }

    info(message: any) {
        console.log(message);
    }

    error(error: any) {
        console.error(error);
    }

    toggle() {
        this.enabled = !this.enabled;
    }
}

export default ThundraLogger;
