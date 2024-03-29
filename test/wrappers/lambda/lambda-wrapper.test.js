import LambdaHandlerWrapper from '../../../dist/wrappers/lambda/LambdaHandlerWrapper';
import ConfigProvider from '../../../dist/config/ConfigProvider';
import ConfigNames from '../../../dist/config/ConfigNames';
import HttpError from '../../../dist/error/HttpError';
import TimeoutError from '../../../dist/error/TimeoutError';
import ExecutionContext from '../../../dist/context/ExecutionContext';
import ExecutionContextManager from '../../../dist/context/ExecutionContextManager';

import TestUtils from '../../utils.js';
import { createMockContext, createMockReporterInstance, createMockPlugin, createMockPluginContext, createMockPromise } from '../../mocks/mocks';

beforeEach(() => {
    TestUtils.clearEnvironmentVariables();
    ConfigProvider.clear();
});

const pluginContext = createMockPluginContext();

jest.useFakeTimers();
jest.setTimeout(10000);

describe('lambda wrapper', () => {

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

        beforeAll(async () => {
            const mockExecContext = new ExecutionContext();
            ExecutionContextManager.set(mockExecContext);

            await thundraWrapper.invoke();
        });

        test('should send reports', () => {
            expect(thundraWrapper.reporter.sendReports).toHaveBeenCalledTimes(1);
        });
        test('should call function', () => {
            expect(originalFunction).toHaveBeenCalledTimes(1);
        });
    });

    describe('report with empty callback', () => {
        const originalCallback = jest.fn();
        const originalFunction = jest.fn((e, c, cb) => cb());
        const thundraWrapper = new LambdaHandlerWrapper(originalThis, originalEvent, originalContext, originalCallback, originalFunction, plugins, pluginContext);
        thundraWrapper.reporter = createMockReporterInstance();

        beforeAll(async () => {
            const mockExecContext = new ExecutionContext();
            ExecutionContextManager.set(mockExecContext);

            await thundraWrapper.invoke();
        });
        it('should not fail', () => {
            expect(thundraWrapper.reporter.sendReports).toBeCalled();
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
        thundraWrapper.reporter = {
            sendReports: jest.fn(() => {
                reportResolve();
            })
        };

        beforeAll(() => {
            const mockExecContext = new ExecutionContext();
            ExecutionContextManager.set(mockExecContext);
        });

        it('setupTimeoutHandler calls set timeout.', async () => {
            thundraWrapper.invoke();
            await reportPromise;
            expect(thundraWrapper.reporter.sendReports).toBeCalledWith([], true);
        });
    });

    describe('original function calls callback', () => {

        describe('wrapped callback', () => {
            beforeEach(() => {
                const mockExecContext = new ExecutionContext();
                ExecutionContextManager.set(mockExecContext);
            });

            describe('with mock reporter', () => {
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

        describe('report once', () => {
            const originalCallback = jest.fn();
            const originalFunction = jest.fn((e, c, cb) => cb());
            const thundraWrapper = new LambdaHandlerWrapper(originalThis, originalEvent, originalContext, originalCallback, originalFunction, plugins, pluginContext);
            thundraWrapper.reported = true;
            thundraWrapper.reporter = createMockReporterInstance();

            beforeAll(async () => {
                await thundraWrapper.invoke();
            });
            it('should not send reports', () => {
                expect(originalCallback).not.toHaveBeenCalled();
            });
            it('should not call callback', () => {
                expect(originalCallback).not.toHaveBeenCalled();
            });
        });

        describe('api gw proxy response fail with status code 500 and json message', () => {
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

        describe('api gw proxy response fail with status code 500 and raw message', () => {
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

        describe('api gw proxy response success with status code 200', () => {
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
            });
        });

    });

    describe('original function calls succeed/done/fail', () => {
        describe('wrapped context', () => {
            const originalFunction = jest.fn();
            const originalCallback = null;
            const originalContext = createMockContext();
            const mockReporter = createMockReporterInstance();

            it('should call wrapped context\'s succeed', async () => {
                const thundraWrapper = new LambdaHandlerWrapper(originalThis, originalEvent, originalContext, originalCallback, originalFunction, plugins, pluginContext);
                thundraWrapper.reporter = mockReporter;
                thundraWrapper.reported = false;

                await thundraWrapper.wrappedContext.succeed({ key: 'data' });
            });

            it('should call wrapped context\'s done', async () => {
                const thundraWrapper = new LambdaHandlerWrapper(originalThis, originalEvent, originalContext, originalCallback, originalFunction, plugins, pluginContext);
                thundraWrapper.reporter = mockReporter;
                thundraWrapper.reported = false;
                
                await thundraWrapper.wrappedContext.done({ err: 'error' }, { key: 'data' });
            });
            
            it('should call wrapped context\'s fail', async () => {
                const thundraWrapper = new LambdaHandlerWrapper(originalThis, originalEvent, originalContext, originalCallback, originalFunction, plugins, pluginContext);
                thundraWrapper.reporter = mockReporter;
                thundraWrapper.reported = false;

                await thundraWrapper.wrappedContext.fail({err: 'error'});
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

            it('should call original function and wrapped context\'s succeed', async () => {
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

        beforeAll(async () => {
            const mockExecContext = new ExecutionContext();
            ExecutionContextManager.set(mockExecContext);

            await thundraWrapper.invoke();
        });

        it('should call originalFunction', () => {
            expect(thundraWrapper.originalFunction).toBeCalled();
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
