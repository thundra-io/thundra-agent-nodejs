import LambdaHandlerWrapper from '../dist/lambda/LambdaHandlerWrapper';
import ConfigProvider from '../dist/config/ConfigProvider';
import ConfigNames from '../dist/config/ConfigNames';
import { createMockContext, createMockReporterInstance, createMockPlugin, createMockPluginContext, createMockPromise } from './mocks/mocks';
import HttpError from '../dist/plugins/error/HttpError';
import TimeoutError from '../dist/plugins/error/TimeoutError';
import ExecutionContext from '../dist/context/ExecutionContext';
import ExecutionContextManager from '../dist/context/ExecutionContextManager';

import TestUtils from './utils.js';

beforeEach(() => {
    TestUtils.clearEnvironmentVariables();
    ConfigProvider.clear();
});

const pluginContext = createMockPluginContext();

jest.useFakeTimers();
jest.setTimeout(10000);

describe('thundra wrapper', () => {

    const originalThis = this;
    const originalEvent = { key1: 'value2', key2: 'value2' };
    const originalContext = createMockContext();
    const plugins = [createMockPlugin()];
    const apiKey = '12345';

    describe('report', () => {
        const originalCallback = jest.fn();
        const originalFunction = jest.fn((e, c, cb) => cb());
        const thundraWrapper = new LambdaHandlerWrapper(originalThis, originalEvent, originalContext, originalCallback, originalFunction, plugins, pluginContext);
        thundraWrapper.reporter = createMockReporterInstance();

        beforeAll((done) => {
            const mockExecContext = new ExecutionContext();
            ExecutionContextManager.set(mockExecContext);

            thundraWrapper.report(null, { result: 'result' }, thundraWrapper.originalCallback).then(done);
        });

        test('should send reports', () => {
            expect(thundraWrapper.reporter.sendReports).toHaveBeenCalledTimes(1);
            expect(thundraWrapper.reported).toBeTruthy();
        });
        test('should call callback', () => {
            expect(originalCallback).toHaveBeenCalledTimes(1);
        });
    });

    describe('report with empty callback', () => {
        const originalCallback = jest.fn();
        const originalFunction = jest.fn((e, c, cb) => cb());
        const thundraWrapper = new LambdaHandlerWrapper(originalThis, originalEvent, originalContext, originalCallback, originalFunction, plugins, pluginContext);
        thundraWrapper.reporter = createMockReporterInstance();

        beforeAll((done) => {
            const mockExecContext = new ExecutionContext();
            ExecutionContextManager.set(mockExecContext);

            thundraWrapper.report(null, null, null).then(done);
        });
        it('should not fail', () => {
            expect(thundraWrapper.reported).toBeTruthy();
        });
    });

    describe('original function throws an error', () => {
        let gotErr = undefined;
        const thrownError = 'err';
        const originalCallback = jest.fn();
        const originalFunction = jest.fn((e, c, cb) => {
            cb(thrownError, null);
        });
        const thundraWrapper = new LambdaHandlerWrapper(originalThis, originalEvent, originalContext, originalCallback, originalFunction, plugins, pluginContext);
        thundraWrapper.reporter = createMockReporterInstance();

        beforeAll(done => {
            const mockExecContext = new ExecutionContext();
            ExecutionContextManager.set(mockExecContext);

            thundraWrapper.invoke().then(done, (err) => {
                gotErr = err;
                done();
            });
        });

        it('should call original function and report', () => {
            expect(originalFunction).toHaveBeenCalledTimes(1);
            expect(gotErr).toEqual(thrownError);
        });
    });

    describe('constructor', () => {
        const originalCallback = jest.fn();
        const originalFunction = jest.fn();
        const thundraWrapper = new LambdaHandlerWrapper(originalThis, originalEvent, originalContext, originalCallback, originalFunction, plugins, pluginContext, apiKey);
        it('should set variables', () => {
            expect(thundraWrapper.originalThis).toBe(originalThis);
            expect(thundraWrapper.originalEvent).toBe(originalEvent);
            expect(thundraWrapper.originalContext).toBe(originalContext);
            expect(thundraWrapper.originalCallback).toBe(originalCallback);
            expect(thundraWrapper.originalFunction).toBe(originalFunction);
            expect(thundraWrapper.plugins).toEqual(plugins);
        });
    });

    describe('timeout', () => {
        const originalCallback = jest.fn();
        const mockContext = createMockContext();
        const mockPluginContext = createMockPluginContext();
        const mockPromise = new Promise((res, rej) => {} );
        const originalFunction = jest.fn(async (event, context, callback) => {
            jest.runAllTimers();
            // Since mock promise is not resolved, awaiting it blocks handler call
            await mockPromise;
            callback(null, 'hey');
        });

        mockContext.getRemainingTimeInMillis = () => 5000;
        mockPluginContext.timeoutMargin = 200;

        const thundraWrapper = new LambdaHandlerWrapper(originalThis, originalEvent, mockContext, originalCallback, originalFunction, plugins, mockPluginContext);

        let reportResolve;
        const reportPromise = new Promise((res, rej) => {
            reportResolve = res;
        });
        thundraWrapper.report = jest.fn(() => {
            reportResolve();
        });

        beforeAll(() => {
            const mockExecContext = new ExecutionContext();
            ExecutionContextManager.set(mockExecContext);
        });

        it('setupTimeoutHandler calls set timeout.', async () => {
            thundraWrapper.invoke();
            await reportPromise;
            expect(thundraWrapper.report).toBeCalledWith(new TimeoutError('Lambda is timed out.'), null, null);
        });
    });

    describe('original function calls callback', () => {

        describe('wrapped callback', () => {
            beforeEach(() => {
                const mockExecContext = new ExecutionContext();
                ExecutionContextManager.set(mockExecContext);
            });

            describe('with mock report function', () => {
                const originalCallback = jest.fn();
                const originalFunction = jest.fn((e, c, cb) => compareBuild());
                const thundraWrapper = new LambdaHandlerWrapper(originalThis, originalEvent, originalContext, originalCallback, originalFunction, plugins, pluginContext);
                thundraWrapper.report = jest.fn();
                it('should call report', () => {
                    thundraWrapper.wrappedCallback();
                    expect(thundraWrapper.report).toBeCalled();
                });
            });

            describe('with real report function', () => {
                const originalCallback = jest.fn();
                const originalFunction = jest.fn((e, c, cb) => cb());
                const thundraWrapper = new LambdaHandlerWrapper(originalThis, originalEvent, originalContext, originalCallback, originalFunction, plugins, pluginContext);
                thundraWrapper.reporter = createMockReporterInstance();
                it('should call reporter.sendReports', async () => {
                    await thundraWrapper.wrappedCallback();
                    expect(thundraWrapper.reporter.sendReports).toBeCalled();
                });
            });

        });

        describe('report once', async () => {
            const originalCallback = jest.fn();
            const originalFunction = jest.fn((e, c, cb) => cb());
            const thundraWrapper = new LambdaHandlerWrapper(originalThis, originalEvent, originalContext, originalCallback, originalFunction, plugins, pluginContext);
            thundraWrapper.reported = true;
            thundraWrapper.reporter = createMockReporterInstance();

            beforeAll(done => {
                thundraWrapper.report(null, { result: 'result' }, thundraWrapper.originalCallback).then(done);
            });
            it('should not send reports', () => {
                expect(originalCallback).not.toHaveBeenCalled();
            });
            it('should not call callback', () => {
                expect(originalCallback).not.toHaveBeenCalled();
            });
        });

        describe('api gw proxy response fail with status code 500 and json message', async () => {
            const originalCallback = jest.fn();
            const originalFunction = jest.fn((e, c, cb) => cb());
            const thundraWrapper = new LambdaHandlerWrapper(originalThis, originalEvent, originalContext, originalCallback, originalFunction, plugins, pluginContext);
            thundraWrapper.executeHook = jest.fn();
            const response = { statusCode: 500, body: '{\'message\':\'I have failed\'}' };
            const mockExecContext = new ExecutionContext();

            beforeAll(() => {
                ExecutionContextManager.set(mockExecContext);

                thundraWrapper.wrappedCallback(null, response);
            });

            it('should extract error from response with valid error response', () => {
                const error = new HttpError('Lambda returned with error response.');

                expect(mockExecContext.response).toBe(response);
                expect(mockExecContext.error).toEqual(error);
            });

        });

        describe('api gw proxy response fail with status code 500 and raw message', async () => {
            const originalCallback = jest.fn();
            const originalFunction = jest.fn((e, c, cb) => cb());
            const thundraWrapper = new LambdaHandlerWrapper(originalThis, originalEvent, originalContext, originalCallback, originalFunction, plugins, pluginContext);
            thundraWrapper.executeHook = jest.fn();
            const response = { statusCode: 500, body: { message: 'I have failed' } };
            const mockExecContext = new ExecutionContext();

            beforeAll(() => {
                ExecutionContextManager.set(mockExecContext);

                thundraWrapper.wrappedCallback(null, response);
            });

            it('should extract error from response with invalid body', () => {
                const error = new HttpError('Lambda returned with error response.');

                expect(mockExecContext.response).toBe(response);
                expect(mockExecContext.error).toEqual(error);
            });
        });

        describe('api gw proxy response success with status code 200', async () => {
            const originalCallback = jest.fn();
            const originalFunction = jest.fn((e, c, cb) => cb());
            const thundraWrapper = new LambdaHandlerWrapper(originalThis, originalEvent, originalContext, originalCallback, originalFunction, plugins, pluginContext);
            thundraWrapper.executeHook = jest.fn();
            const response = { statusCode: 200, body: '{\'message\':\'I have failed\'}' };
            const mockExecContext = new ExecutionContext();

            beforeAll(() => {
                ExecutionContextManager.set(mockExecContext);

                thundraWrapper.wrappedCallback(null, response);
            });
            it('should extract error from response with success status', () => {
                expect(mockExecContext.response).toBe(response);
                expect(mockExecContext.error).toBeNull();
            });

        });

        describe('invoke', () => {
            const originalCallback = jest.fn();
            const originalFunction = jest.fn((e, c, cb) => cb());
            const thundraWrapper = new LambdaHandlerWrapper(originalThis, originalEvent, originalContext, originalCallback, originalFunction, plugins, pluginContext);
            thundraWrapper.reporter = createMockReporterInstance();

            it('should call original function and callback once', async () => {
                await thundraWrapper.invoke();
                expect(originalFunction.mock.calls.length).toBe(1);
                expect(originalCallback.mock.calls.length).toBe(1);
            });
        });

    });

    describe('original function calls succeed/done/fail', () => {
        describe('wrapped context', () => {
            const originalFunction = jest.fn();
            const originalCallback = null;
            const originalContext = createMockContext();
            const mockReporter = createMockReporterInstance();

            it('should call original context\'s succeed', async () => {
                const thundraWrapper = new LambdaHandlerWrapper(originalThis, originalEvent, originalContext, originalCallback, originalFunction, plugins, pluginContext);
                thundraWrapper.reporter = mockReporter;
                thundraWrapper.reported = false;

                await thundraWrapper.wrappedContext.succeed({ key: 'data' });
                expect(originalContext.succeed).toBeCalledWith({ key: 'data' });
            });

            it('should call original context\'s done', async () => {
                const thundraWrapper = new LambdaHandlerWrapper(originalThis, originalEvent, originalContext, originalCallback, originalFunction, plugins, pluginContext);
                thundraWrapper.reporter = mockReporter;
                thundraWrapper.reported = false;
                
                await thundraWrapper.wrappedContext.done({ err: 'error' }, { key: 'data' });
                expect(originalContext.done).toBeCalledWith({ err: 'error' }, { key: 'data' });
            });
            
            it('should call original context\'s fail', async () => {
                const thundraWrapper = new LambdaHandlerWrapper(originalThis, originalEvent, originalContext, originalCallback, originalFunction, plugins, pluginContext);
                thundraWrapper.reporter = mockReporter;
                thundraWrapper.reported = false;

                await thundraWrapper.wrappedContext.fail({err: 'error'});
                expect(originalContext.fail).toBeCalledWith({err: 'error'});
            });
        });

        describe('invoke', () => {
            const originalContext = createMockContext();
            const originalCallback = null;
            const originalFunction = jest.fn((e, c) => c.succeed());
            const thundraWrapper = new LambdaHandlerWrapper(originalThis, originalEvent, originalContext, originalCallback, originalFunction, plugins, pluginContext);
            thundraWrapper.wrappedContext.succeed = jest.fn();

            beforeAll(() => {
                const mockExecContext = new ExecutionContext();
                ExecutionContextManager.set(mockExecContext);

                thundraWrapper.invoke();
            });

            it('should call original function and wrappedContext\'s succeed', async () => {
                expect(originalFunction).toHaveBeenCalledTimes(1);
                expect(thundraWrapper.wrappedContext.succeed).toHaveBeenCalledTimes(1);
            });
        });

    });

    describe('original function returns promise', () => {
        const mockPromise = createMockPromise();
        const originalCallback = jest.fn();
        const originalFunction = jest.fn((e, c) => mockPromise);
        const thundraWrapper = new LambdaHandlerWrapper(originalThis, originalEvent, originalContext, originalCallback, originalFunction, plugins, pluginContext);
        thundraWrapper.reporter = createMockReporterInstance();

        beforeAll(async (done) => {
            const mockExecContext = new ExecutionContext();
            ExecutionContextManager.set(mockExecContext);

            thundraWrapper.invoke().then(() => done());
        });

        it('should call originalCallback', () => {
            expect(originalContext.succeed).toBeCalledWith('test');
        });
        it('should call reporter.sendReports', () => {
            expect(thundraWrapper.reporter.sendReports).toBeCalled();
        });
    });

    describe('should correctly decide to init debugger', () => {
        const originalCallback = jest.fn();
        const originalFunction = jest.fn((e, c, cb) => cb());
        const pc = createMockPluginContext();

        const thundraWrapper = new LambdaHandlerWrapper(originalThis, originalEvent, originalContext, originalCallback, originalFunction, plugins, pc);

        test('when debugger disabled and no token', () => {
            ConfigProvider.set(ConfigNames.THUNDRA_LAMBDA_DEBUGGER_ENABLE, false);

            expect(thundraWrapper.shouldInitDebugger()).toBeFalsy();
        });

        test('when debugger enabled and no token', () => {
            ConfigProvider.set(ConfigNames.THUNDRA_LAMBDA_DEBUGGER_ENABLE, true);

            expect(thundraWrapper.shouldInitDebugger()).toBeFalsy();
        });

        test('when debugger disabled and token exists', () => {
            ConfigProvider.set(ConfigNames.THUNDRA_LAMBDA_DEBUGGER_AUTH_TOKEN, 'foobar');
            ConfigProvider.set(ConfigNames.THUNDRA_LAMBDA_DEBUGGER_ENABLE, false);

            expect(thundraWrapper.shouldInitDebugger()).toBeFalsy();
        });

        test('when no token and no enable setting exist', () => {
            expect(thundraWrapper.shouldInitDebugger()).toBeFalsy();
        });

        test('when token exists and no enable setting exists', () => {
            ConfigProvider.set(ConfigNames.THUNDRA_LAMBDA_DEBUGGER_AUTH_TOKEN, 'foobar');

            expect(thundraWrapper.shouldInitDebugger()).toBeTruthy();
        });

        test('when token and enable setting exist', () => {
            ConfigProvider.set(ConfigNames.THUNDRA_LAMBDA_DEBUGGER_AUTH_TOKEN, 'foobar');
            ConfigProvider.set(ConfigNames.THUNDRA_LAMBDA_DEBUGGER_ENABLE, true);

            expect(thundraWrapper.shouldInitDebugger()).toBeTruthy();
        });
    });

});
