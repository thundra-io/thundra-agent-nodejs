import ConfigProvider from './config/ConfigProvider';
import ConfigNames from './config/ConfigNames';

class ThundraLogger {
    static instance: ThundraLogger;
    enabled: boolean;

    constructor() {
        this.enabled = ConfigProvider.get<boolean>(ConfigNames.THUNDRA_DEBUG_ENABLE);
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
