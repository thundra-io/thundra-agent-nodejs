import Logger from './Logger';

class LogManager {
    static listeners: any[] = [];

    static addListener(listener: any) {
        if (!LogManager.listeners.includes(listener)) {
            LogManager.listeners = [...LogManager.listeners, listener];
        }
    }

    static createLogger(options: any) {
        return new Logger(options);
    }

    static reportLog(logReport: any) {
        LogManager.listeners.forEach((listener) => {
            listener.reportLog(logReport);
        });
    }

    static destroy() {
        LogManager.listeners = [];
    }
}

export default LogManager;
