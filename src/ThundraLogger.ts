import ConfigProvider from './config/ConfigProvider';
import ConfigNames from './config/ConfigNames';

class ThundraLogger {

    private constructor() {
    }

    static isDebugEnabled(): boolean {
        return ConfigProvider.get<boolean>(ConfigNames.THUNDRA_DEBUG_ENABLE);
    }

    static debug(message: any) {
        if (ThundraLogger.isDebugEnabled()) {
            console.log(message);
        }
    }

    static info(message: any) {
        console.log(message);
    }

    static error(error: any) {
        console.error(error);
    }

}

export default ThundraLogger;
