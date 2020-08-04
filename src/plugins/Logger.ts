import { logLevels } from '../Constants';
import * as util from 'util';
import LogManager from './LogManager';
import ConfigProvider from '../config/ConfigProvider';
import ConfigNames from '../config/ConfigNames';

/**
 * Thundra's logger implementation
 */
class Logger {

    options: any;
    loggerName: any;
    logLevel: any;
    levels: any;

    constructor(options: { loggerName: any; }) {
        this.options = options;
        this.loggerName = options && options.loggerName ? options.loggerName : 'default';
        const levelConfig = ConfigProvider.get<string>(ConfigNames.THUNDRA_LOG_LOGLEVEL);
        this.logLevel = levelConfig && logLevels[levelConfig] ? logLevels[levelConfig] : 0;
        this.levels = {          // higher number = higher priority
            trace: this.trace, // 0
            debug: this.debug, // 1
            info: this.info,   // 2
            warn: this.warn,   // 3
            error: this.error, // 4
            fatal: this.fatal, // 5
        };
    }

    /**
     * Reports the given log
     * @param level the log level
     * @param args the log arguments
     */
    reportLog(level: any, args: any) {
        const logInfo = {
            logMessage: util.format.apply(util, args),
            logLevel: level,
            logLevelCode: logLevels[level],
            logContextName: this.loggerName,
            logTimestamp: Date.now(),
        };
        LogManager.reportLog(logInfo);
    }

    /**
     * Logs in {@code TRACE} level
     * @param args the log arguments
     */
    trace(...args: any[]) {
        this.reportLog('TRACE', args);
    }

    /**
     * Logs in {@code DEBUG} level
     * @param args the log arguments
     */
    debug(...args: any[]) {
        this.reportLog('DEBUG', args);
    }

    /**
     * Logs in {@code INFO} level
     * @param args the log arguments
     */
    info(...args: any[]) {
        this.reportLog('INFO', args);
    }

    /**
     * Logs in {@code WARN} level
     * @param args the log arguments
     */
    warn(...args: any[]) {
        this.reportLog('WARN', args);
    }

    /**
     * Logs in {@code ERROR} level
     * @param args the log arguments
     */
    error(...args: any[]) {
        this.reportLog('ERROR', args);
    }

    /**
     * Logs in {@code FATAL} level
     * @param args the log arguments
     */
    fatal(...args: any[]) {
        this.reportLog('FATAL', args);
    }

    /**
     * Logs directly by given arguments
     * @param args the log arguments
     */
    log(...args: any[]) {
        if (args.length === 0) {
            throw new Error('[ThundraLogger] no arguments provided');
        }

        if (typeof args[0] === 'string') {
            if (args[0] in this.levels) {
                if (args.length === 1) {
                    throw new Error('[ThundraLogger] empty log');
                } else {
                    this.levels[args[0]](...args.slice(1));
                }
            } else {
                // tslint:disable-next-line:max-line-length
                throw new Error(`[ThundraLogger] level ${args[0]} is not defined, available levels are ${Object.keys(this.levels)}`);
            }
        } else if (args[0] !== null && typeof args[0] === 'object') {
            if (Object.keys(args[0]).length === 2 && 'level' in args[0] && 'message' in args[0]) {
                const level = args[0].level;
                const message = args[0].message;
                if (level in this.levels) {
                    this.levels[level](message);
                } else {
                    // tslint:disable-next-line:max-line-length
                    throw new Error(`[ThundraLogger] level ${level} is not defined, available levels are ${Object.keys(this.levels)}`);
                }
            } else {
                throw new Error('[ThundraLogger] invalid usage, please provide both level and message');
            }
        } else {
            throw new Error('[ThundraLogger] invalid usage');
        }
    }

    /**
     * Destroys plugin
     */
    destroy(): void {
        // pass
    }

}

export default Logger;
