import Logger from '../../dist/plugins/Logger';
import {logLevels} from '../../dist/Constants';
import {createMockLogManager} from '../mocks/mocks';

describe('Logger', () => {
    delete process.env.thundra_agent_lambda_log_loglevel;
    describe('constructor', () => {
        const logManager = createMockLogManager();
        const options = {opt1: 1, opt2: 2};
        const logger = new Logger(options, logManager);
        const loggerWithName = new Logger({loggerName: 'logger'}, logManager);
        it('should set options', () => {
            expect(logger.options).toBe(options);
        });
        it('should set logManager', () => {
            expect(logger.logManager).toBe(logManager);
        });
        it('should set loggerName', () => {
            expect(logger.loggerName).toBe('default');
            expect(loggerWithName.loggerName).toBe('logger');
        });
        it('should set levels', () => {
            expect(logger.levels).toEqual({
                'error': logger.error,
                'warn': logger.warn,
                'info': logger.info,
                'debug': logger.debug,
                'trace': logger.trace,
                'fatal': logger.fatal
            });
        });

    });

    describe('error', () => {
        const logManager = createMockLogManager();
        const logger = new Logger({}, logManager);
        logger.reportLog = jest.fn();
        logger.error(1, 2, 3);
        it('should report log', () => {
            expect(logger.reportLog).toBeCalledWith('ERROR', [1, 2, 3]);
        });
    });

    describe('warn', () => {
        const logManager = createMockLogManager();
        const logger = new Logger({}, logManager);
        logger.reportLog = jest.fn();
        logger.warn(1, 2, 3);
        it('should report log', () => {
            expect(logger.reportLog).toBeCalledWith('WARN', [1, 2, 3]);
        });
    });

    describe('info', () => {
        const logManager = createMockLogManager();
        const logger = new Logger({}, logManager);
        logger.reportLog = jest.fn();
        logger.info(1, 2, 3);
        it('should report log', () => {
            expect(logger.reportLog).toBeCalledWith('INFO', [1, 2, 3]);
        });
    });

    describe('debug', () => {
        const logManager = createMockLogManager();
        const logger = new Logger({}, logManager);
        logger.reportLog = jest.fn();
        logger.debug(1, 2, 3);
        it('should report log', () => {
            expect(logger.reportLog).toBeCalledWith('DEBUG', [1, 2, 3]);
        });
    });

    describe('trace', () => {
        const logManager = createMockLogManager();
        const logger = new Logger({}, logManager);
        logger.reportLog = jest.fn();
        logger.trace(1, 2, 3);
        it('should report log', () => {
            expect(logger.reportLog).toBeCalledWith('TRACE', [1, 2, 3]);
        });
    });

    describe('fatal', () => {
        const logManager = createMockLogManager();
        const logger = new Logger({}, logManager);
        logger.reportLog = jest.fn();
        logger.fatal(1, 2, 3);
        it('should report log', () => {
            expect(logger.reportLog).toBeCalledWith('FATAL', [1, 2, 3]);
        });
    });

    describe('reportLog', () => {
        const logManager = createMockLogManager();
        const logger = new Logger({}, logManager);
        Date.now = () => {return null;};
        const logReport = {
            logMessage: 'test 1 {\"key1\":1,\"key2\":\"two\"} more',
            logLevel: 'DEBUG',
            logLevelCode: logLevels['DEBUG'],
            logContextName: logger.loggerName,
            logTimestamp: null,
        };
        logger.reportLog('DEBUG', ['%s %d %j', 'test', 1, {key1: 1, key2: 'two'}, 'more']);
        it('should call logManager.reportLog', () => {
            expect(logManager.reportLog).toBeCalledWith(logReport);
        });
    });

});

describe('Logger with env level variable', () => {
    process.env.thundra_agent_lambda_log_loglevel = 'none';
    describe('should not report', () => {
        const logManager = createMockLogManager();
        const logger = new Logger({}, logManager);
        logger.reportLog = jest.fn();
        logger.fatal(1, 2, 3);
        logger.error(1, 2, 3);
        logger.warn(1, 2, 3);
        logger.info(1, 2, 3);
        logger.debug(1, 2, 3);
        logger.trace(1, 2, 3);
        it('should report log', () => {
            expect(logger.reportLog).not.toBeCalled();
        });
    });
});

describe('log', () => {
    delete process.env.thundra_agent_lambda_log_loglevel;
    const logManager = createMockLogManager();
    const logger = new Logger({}, logManager);
    logger.levels = {
        'trace': jest.fn(),
        'debug': jest.fn(),
        'info': jest.fn(),
        'warn': jest.fn(),
        'error': jest.fn(),
        'fatal': jest.fn()
    };

    logger.log('trace', 'trace %s %d', 'world', 1);
    logger.log('debug', 'debug %s %d', 'world', 1);
    logger.log('info', 'info %s %d', 'world', 1);
    logger.log('warn', 'warn %s %d', 'world', 1);
    logger.log('error', 'error %s %d', 'world', 1);
    logger.log('fatal', 'fatal %s %d', 'world', 1);
    it('should call level functions when called with string parameters', () => {
        expect(logger.levels.trace).toBeCalledWith('trace %s %d', 'world', 1);
        expect(logger.levels.debug).toBeCalledWith('debug %s %d', 'world', 1);
        expect(logger.levels.info).toBeCalledWith('info %s %d', 'world', 1);
        expect(logger.levels.warn).toBeCalledWith('warn %s %d', 'world', 1);
        expect(logger.levels.error).toBeCalledWith('error %s %d', 'world', 1);
        expect(logger.levels.fatal).toBeCalledWith('fatal %s %d', 'world', 1);
    });

    logger.log({level: 'trace', message: 'this is trace'});
    logger.log({level: 'debug', message: 'this is debug'});
    logger.log({level: 'info', message: 'this is info'});
    logger.log({level: 'warn', message: 'this is warn'});
    logger.log({level: 'error', message: 'this is error'});
    logger.log({level: 'fatal', message: 'this is fatal'});
    it('should call level functions when called with object parameter', () => {
        expect(logger.levels.trace).toBeCalledWith('this is trace');
        expect(logger.levels.debug).toBeCalledWith('this is debug');
        expect(logger.levels.info).toBeCalledWith('this is info');
        expect(logger.levels.warn).toBeCalledWith('this is warn');
        expect(logger.levels.error).toBeCalledWith('this is error');
        expect(logger.levels.fatal).toBeCalledWith('this is fatal');
    });


    const callWithoutArguments = () => logger.log();
    const callWithInvalidLevel = () => logger.log('invalid');
    const callWithLevelButNoMessage = () => logger.log('error');
    const callWithInvalidObject = () => logger.log({invalid: 'very-invalid'});
    const callWithObjectAndInvalidLevel = () => logger.log({level: 'invalid', message: 'hello'});
    const callWithNullObject = () => logger.log(null);
    it('should throw error', () => {
        expect(callWithoutArguments).toThrow('[ThundraLogger] no arguments provided');
        expect(callWithInvalidLevel).toThrow('[ThundraLogger] level invalid is not defined, available levels are trace,debug,info,warn,error,fatal');
        expect(callWithLevelButNoMessage).toThrow('[ThundraLogger] empty log');
        expect(callWithInvalidObject).toThrow('[ThundraLogger] invalid usage, please provide both level and message');
        expect(callWithObjectAndInvalidLevel).toThrow('[ThundraLogger] level invalid is not defined, available levels are trace,debug,info,warn,error,fatal');
        expect(callWithNullObject).toThrow('[ThundraLogger] invalid usage');
    });
});