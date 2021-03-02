import ConfigProvider from './config/ConfigProvider';
import ConfigNames from './config/ConfigNames';

/**
 * Logger for logging Thundra related internal messages, errors
 */
class ThundraLogger {

    /*
     Get references of the original console methods
     as they will be patched by Thundra Log plugin if logging is enabled.
     So we don't want to capture our internal logs in that case.
     */

    private static readonly consoleDebug: Function = ThundraLogger.getConsoleMethod('debug');
    private static readonly consoleInfo: Function = ThundraLogger.getConsoleMethod('info');
    private static readonly consoleError: Function = ThundraLogger.getConsoleMethod('error');

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
            this.consoleDebug.apply(console, ['[THUNDRA]', message, ...optionalParams]);
        }
    }

    /**
     * Logs given message
     * @param message the message to be logged
     * @param optionalParams the optional parameters to be logged
     */
    static info(message: any, ...optionalParams: any[]) {
        this.consoleInfo.apply(console, ['[THUNDRA]', message, ...optionalParams]);
    }

    /**
     * Logs given error
     * @param error the error to be logged
     * @param optionalParams the optional parameters to be logged
     */
    static error(error: any, ...optionalParams: any[]) {
        this.consoleError.apply(console, ['[THUNDRA]', error, ...optionalParams]);
    }

    private static getConsoleMethod(methodName: string): Function {
        const consoleReference: any = console;
        const originalMethodName = `original_${methodName}`;
        const consoleMethod: Function = consoleReference[methodName];
        const consoleOriginalMethod: Function = consoleReference[originalMethodName];
        // If console method is shimmed by Thundra, original method is kept there with different name.
        // So if the original one is there, return it. Otherwise, return the found one.
        if (consoleOriginalMethod) {
            return consoleOriginalMethod;
        } else {
            return consoleMethod;
        }
    }

}

export default ThundraLogger;
