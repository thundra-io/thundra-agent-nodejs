import Logger from './Logger';
import LogPlugin from './Log';

class LogManager {
    listeners: any[];

    constructor() {
        this.listeners = [];
    }

    addListener = (listener: any) => {
        this.listeners = [...this.listeners, listener];
    }

    createLogger(options: any) {
        const logger = new Logger(options, this);
        return {
            trace: logger.trace,
            debug: logger.debug,
            info: logger.info,
            warn: logger.warn,
            error: logger.error,
            fatal: logger.fatal,
            log: logger.log,
        };
    }

    /*createLogPlugin(options: any) {
        const logPlugin = LogPlugin(options);
        this.addListener(logPlugin);
        return logPlugin;
    }*/

    reportLog(logReport: any) {
        this.listeners.forEach((listener) => {
            listener.reportLog(logReport);
        });
    }
}

export default LogManager;
