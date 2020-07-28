import LogManager from '../../dist/plugins/LogManager';

import { createMockListener } from '../mocks/mocks';

describe('log manager', () => {
    beforeEach(() => {
        LogManager.destroy();
    });
    describe('constructor', () => {
        it('should set variables', () => {
            expect(LogManager.listeners).toEqual([]);
        });
    });

    describe('add listener', () => {
        it('should add listeners', () => {
            const listener1 = createMockListener();
            const listener2 = createMockListener();
            LogManager.addListener(listener1);
            LogManager.addListener(listener2);
            expect(LogManager.listeners).toEqual([listener1, listener2]);
        });
    });

    describe('create logger', () => {
        it('should export logger with correct methods', () => {
            const logger = LogManager.createLogger();
            expect(typeof logger.trace).toEqual('function');
            expect(typeof logger.debug).toEqual('function');
            expect(typeof logger.info).toEqual('function');
            expect(typeof logger.warn).toEqual('function');
            expect(typeof logger.error).toEqual('function');
            expect(typeof logger.fatal).toEqual('function');
            expect(typeof logger.log).toEqual('function');
        });
    });

    describe('report log', () => {
        it('should report to each listener', () => {
            const listener1 = createMockListener();
            const listener2 = createMockListener();
            LogManager.listeners = [listener1, listener2];
            LogManager.reportLog('logReport');
            expect(listener1.reportLog).toBeCalledWith('logReport');
            expect(listener2.reportLog).toBeCalledWith('logReport');
        });
    });
});