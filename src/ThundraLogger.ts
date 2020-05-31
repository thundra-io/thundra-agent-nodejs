import ConfigProvider from './config/ConfigProvider';
import ConfigNames from './config/ConfigNames';

class ThundraLogger {
    static instance: ThundraLogger;
    debugEnabled: boolean;

    constructor() {
        this.debugEnabled = ConfigProvider.get<boolean>(ConfigNames.THUNDRA_DEBUG_ENABLE);
        ThundraLogger.instance = this;
    }

    static getInstance(): ThundraLogger {
        return ThundraLogger.instance ? ThundraLogger.instance : new ThundraLogger();
    }

    isDebugEnabled(): boolean {
        return this.debugEnabled;
    }

    debug(message: any) {
        if (this.debugEnabled) {
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
        this.debugEnabled = !this.debugEnabled;
    }
}

export default ThundraLogger;
