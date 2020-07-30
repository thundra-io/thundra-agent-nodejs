import ConfigProvider from './config/ConfigProvider';
import ConfigNames from './config/ConfigNames';

/**
 * Logger for logging Thundra related internal messages, errors
 */
class ThundraLogger {

    private constructor() {
    }

    /**
     * Checks whether debug level logging is enabled
     * @return {@code true} if debug level logging is enabled,
     *         {@code false} otherwise
     */
    static isDebugEnabled(): boolean {
        return ConfigProvider.get<boolean>(ConfigNames.THUNDRA_DEBUG_ENABLE);
    }

    /**
     * Logs given message if debug level logging is enabled
     * @param {string} message the message to be logged
     */
    static debug(message: any) {
        if (ThundraLogger.isDebugEnabled()) {
            console.log(message);
        }
    }

    /**
     * Logs given message
     * @param {string} message the message to be logged
     */
    static info(message: any) {
        console.log(message);
    }

    /**
     * Logs given error
     * @param {Error} error the error to be logger
     */
    static error(error: any) {
        console.error(error);
    }

}

export default ThundraLogger;
