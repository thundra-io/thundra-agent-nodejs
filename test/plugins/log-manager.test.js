import LogManager from '../../dist/plugins/LogManager';
import {createMockListener} from '../mocks/mocks';

describe('LogManager', () => {
    describe('constructor', () => {
        const logManager = new LogManager();
        it('should set variables', () => {
            expect(logManager.listeners).toEqual([]);
        });
    });

    describe('addListener', () => {
        const logManager = new LogManager();
        const listener1 = createMockListener();
        const listener2 = createMockListener();
        logManager.addListener(listener1);
        logManager.addListener(listener2);
        it('should add listeners', () => {
            expect(logManager.listeners).toEqual([listener1, listener2]);
        });
    });

    describe('createLogger', () => {
        const logManager = new LogManager();
        const logger = logManager.createLogger();
        it('should export logger with correct methods', () => {
            expect(typeof logger.trace).toEqual('function');
            expect(typeof logger.debug).toEqual('function');
            expect(typeof logger.info).toEqual('function');
            expect(typeof logger.warn).toEqual('function');
            expect(typeof logger.error).toEqual('function');
            expect(typeof logger.fatal).toEqual('function');
            expect(typeof logger.log).toEqual('function');
        });
    });

    describe('reportLog', () => {
        const logManager = new LogManager();
        const listener1 = createMockListener();
        const listener2 = createMockListener();
        logManager.listeners = [listener1, listener2];
        logManager.reportLog('logReport');
        it('should report to each listener', () => {
            expect(listener1.reportLog).toBeCalledWith('logReport');
            expect(listener2.reportLog).toBeCalledWith('logReport');
        });

    });
});