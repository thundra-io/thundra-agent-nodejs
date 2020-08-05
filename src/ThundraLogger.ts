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
     * @param message the message to be logged
     * @param optionalParams the optional parameters to be logged
     */
    static debug(message: any, ...optionalParams: any[]) {
        if (ThundraLogger.isDebugEnabled()) {
            console.log('[THUNDRA]', message, ...optionalParams);
        }
    }

    /**
     * Logs given message
     * @param message the message to be logged
     * @param optionalParams the optional parameters to be logged
     */
    static info(message: any, ...optionalParams: any[]) {
        console.log('[THUNDRA]', message, ...optionalParams);
    }

    /**
     * Logs given error
     * @param error the error to be logged
     * @param optionalParams the optional parameters to be logged
     */
    static error(error: any, ...optionalParams: any[]) {
        console.error('[THUNDRA]', error, ...optionalParams);
    }

}

export default ThundraLogger;
