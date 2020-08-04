import Logger from './Logger';

/**
 * Mediator class for log related operations
 */
class LogManager {

    private static listeners: any[] = [];

    private constructor() {
    }

    /**
     * Adds the log listener to be invoked by reported logs
     * @param listener the log listener to be invoked by reported logs
     */
    static addListener(listener: any) {
        if (!LogManager.listeners.includes(listener)) {
            LogManager.listeners = [...LogManager.listeners, listener];
        }
    }

    /**
     * Creates {@link Logger} to log through
     * @param options the options
     * @return {Logger} {@link Logger} to log through
     */
    static createLogger(options: any) {
        return new Logger(options);
    }

    /**
     * Reports log
     * @param logReport the log to be reported
     */
    static reportLog(logReport: any) {
        LogManager.listeners.forEach((listener) => {
            listener.reportLog(logReport);
        });
    }

    /**
     * Destroys the log manager
     */
    static destroy() {
        LogManager.listeners = [];
    }

}

export default LogManager;
