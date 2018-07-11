import ThundraWrapper from '../src/thundra-wrapper';
import {createMockContext, createMockReporterInstance, createMockPlugin, createMockPluginContext} from './mocks/mocks';
import {TimeoutError} from '../src/constants';

const pluginContext = createMockPluginContext();
describe('ThundraWrapper', () => {
    const originalThis = this;
    const originalEvent = {key1: 'value2', key2: 'value2'};
    const originalContext = createMockContext();
    originalContext.getRemainingTimeInMillis = () => 10000;
    const plugins = [createMockPlugin()];
    const apiKey = '12345';
    pluginContext.timeoutMargin = 200;

    describe('report', async () => {
        jest.useFakeTimers();
        process.env.thundra_lambda_publish_cloudwatch_enable = 'false';
        const originalCallback = jest.fn();
        const originalFunction = jest.fn(() => originalCallback());
        const thundraWrapper = new ThundraWrapper(originalThis, originalEvent, originalContext, originalCallback, originalFunction, plugins, pluginContext, apiKey);
        thundraWrapper.reporter = createMockReporterInstance();
        await thundraWrapper.report(null, {result: 'result'}, thundraWrapper.originalCallback);
        it('should send reports', () => {
            expect(thundraWrapper.reporter.sendReports.mock.call.length).toBe(1);
            expect(thundraWrapper.reported).toBeTruthy();
        });
        it('should call callback', () => {
            expect(originalCallback.mock.call.length).toBe(1);
        });
        it('should call clearTimeout', () => {
            expect(clearTimeout).toHaveBeenCalledTimes(1);
        });
    });

    describe('report with empty callback', async () => {
        const originalCallback = jest.fn();
        const originalFunction = jest.fn(() => originalCallback());
        const thundraWrapper = new ThundraWrapper(originalThis, originalEvent, originalContext, originalCallback, originalFunction, plugins, pluginContext, apiKey);
        thundraWrapper.reporter = createMockReporterInstance();
        await thundraWrapper.report(null, null, null);
        it('should not fail', () => {
            expect(thundraWrapper.reported).toBeTruthy();
        });
    });

    describe('original function throws an error', () => {
        const thrownError = 'err';
        const originalCallback = jest.fn();
        const originalFunction = jest.fn(() => {
            throw(thrownError)
        });
        const thundraWrapper = new ThundraWrapper(originalThis, originalEvent, originalContext, originalCallback, originalFunction, plugins, pluginContext, apiKey);
        thundraWrapper.report = jest.fn();
        thundraWrapper.invoke();
        it('should call original function and report', () => {
            expect(originalFunction.mock.calls.length).toBe(1);
            expect(thundraWrapper.report).toBeCalledWith(thrownError, null);
        });
    });

    describe('constructor', () => {
        const originalCallback = jest.fn();
        const originalFunction = jest.fn();
        const thundraWrapper = new ThundraWrapper(originalThis, originalEvent, originalContext, originalCallback, originalFunction, plugins, pluginContext, apiKey);
        it('should set variables', () => {
            expect(thundraWrapper.originalThis).toBe(originalThis);
            expect(thundraWrapper.originalEvent).toBe(originalEvent);
            expect(thundraWrapper.originalContext).toBe(originalContext);
            expect(thundraWrapper.originalCallback).toBe(originalCallback);
            expect(thundraWrapper.originalFunction).toBe(originalFunction);
            expect(thundraWrapper.plugins).toEqual(plugins);
            expect(thundraWrapper.apiKey).toBe(apiKey);
        });
    });

    describe('timeout', () => {
        const originalCallback = jest.fn();
        const originalFunction = jest.fn();
        jest.useFakeTimers();
        const thundraWrapper = new ThundraWrapper(originalThis, originalEvent, originalContext, originalCallback, originalFunction, plugins, pluginContext, apiKey);
        thundraWrapper.report = jest.fn();
        jest.runAllTimers();
        it('setupTimeoutHandler calls set timeout.', () => {
            expect(thundraWrapper.report).toBeCalledWith(new TimeoutError(99, 'Lambda Timeout Exceeded.'), null, null);
        });
    });

    describe('originalFunction calls callback', () => {
        describe('wrappedCallback', () => {
            describe('with mock report function', () => {
                const originalCallback = jest.fn();
                const originalFunction = jest.fn(() => originalCallback());
                const thundraWrapper = new ThundraWrapper(originalThis, originalEvent, originalContext, originalCallback, originalFunction, plugins, pluginContext, apiKey);
                thundraWrapper.report = jest.fn();
                thundraWrapper.wrappedCallback();
                it('should call report', () => {
                    expect(thundraWrapper.report).toBeCalled();
                });
            });
            describe('with real report function', () => {
                const originalCallback = jest.fn();
                const originalFunction = jest.fn(() => originalCallback());
                const thundraWrapper = new ThundraWrapper(originalThis, originalEvent, originalContext, originalCallback, originalFunction, plugins, pluginContext, apiKey);
                thundraWrapper.reporter = createMockReporterInstance();
                thundraWrapper.wrappedCallback();
                it('should call reporter.sendReports', () => {
                    expect(thundraWrapper.reporter.sendReports).toBeCalled();
                });
            });
        });


        describe('report once', async () => {
            const originalCallback = jest.fn();
            const originalFunction = jest.fn(() => originalCallback());
            const thundraWrapper = new ThundraWrapper(originalThis, originalEvent, originalContext, originalCallback, originalFunction, plugins, pluginContext, apiKey);
            thundraWrapper.reported = true;
            thundraWrapper.reporter = createMockReporterInstance();
            await thundraWrapper.report(null, {result: 'result'}, thundraWrapper.originalCallback);
            it('should not send reports', () => {
                expect(thundraWrapper.reporter.sendReports.mock.call.length).toBe(0);
            });
            it('should not call callback', () => {
                expect(originalCallback.mock.call.length).toBe(0);
            });
        });

        describe('AWS Lambda Proxy Response', async () => {
            const originalCallback = jest.fn();
            const originalFunction = jest.fn(() => originalCallback());
            const thundraWrapper = new ThundraWrapper(originalThis, originalEvent, originalContext, originalCallback, originalFunction, plugins, pluginContext, apiKey);
            thundraWrapper.executeHook = jest.fn();
            thundraWrapper.wrappedCallback(null, {statusCode: 500, body:'{\"message\":\"I have failed\"}'});
            it('should extract error from response with valid error response', () => {
                const expectedAfterInvocationData = {
                    error: new Error("Lambda returned with error response."),
                    response: null   
                }
                expect(thundraWrapper.executeHook).toBeCalledWith('after-invocation', expectedAfterInvocationData);
            });
            
        });

        describe('AWS Lambda Proxy Response', async () => {
            const originalCallback = jest.fn();
            const originalFunction = jest.fn(() => originalCallback());
            const thundraWrapper = new ThundraWrapper(originalThis, originalEvent, originalContext, originalCallback, originalFunction, plugins, pluginContext, apiKey);
            thundraWrapper.executeHook = jest.fn();
            thundraWrapper.wrappedCallback(null, {statusCode: 500, body:{ message: 'I have failed'}});
            it('should extract error from response with invalid body', () => {   
                const expectedAfterInvocationData = {
                    error: new Error("Lambda returned with error response."),
                    response: null   
                }
                expect(thundraWrapper.executeHook).toBeCalledWith('after-invocation', expectedAfterInvocationData);
            });   
        });

        describe('AWS Lambda Proxy Response', async () => {
            const originalCallback = jest.fn();
            const originalFunction = jest.fn(() => originalCallback());
            const thundraWrapper = new ThundraWrapper(originalThis, originalEvent, originalContext, originalCallback, originalFunction, plugins, pluginContext, apiKey);
            thundraWrapper.executeHook = jest.fn();
            thundraWrapper.wrappedCallback(null, {statusCode: 200, body:'{\"message\":\"I have failed\"}'});
            it('should extract error from response with success status', () => {   
                const expectedAfterInvocationData = {
                    error: null,
                    response: {statusCode: 200, body:'{\"message\":\"I have failed\"}'}  
                }
                expect(thundraWrapper.executeHook).toBeCalledWith('after-invocation', expectedAfterInvocationData);
            });
            
        });

        describe('invoke', () => {
            const originalCallback = jest.fn();
            const originalFunction = jest.fn(() => originalCallback());
            const thundraWrapper = new ThundraWrapper(originalThis, originalEvent, originalContext, originalCallback, originalFunction, plugins, pluginContext, apiKey);
            thundraWrapper.reporter = createMockReporterInstance();
            thundraWrapper.invoke();
            it('should call original function and callback once', () => {
                expect(originalFunction.mock.calls.length).toBe(1);
                expect(originalCallback.mock.calls.length).toBe(1);
            });
        });

    });

    describe('originalFunction calls succeed/done/fail', () => {

        describe('wrappedContext', () => {
            const originalFunction = jest.fn();
            const originalCallback = null;
            const originalContext = createMockContext();
            const thundraWrapper = new ThundraWrapper(originalThis, originalEvent, originalContext, originalCallback, originalFunction, plugins, pluginContext, apiKey);
            thundraWrapper.reporter = createMockReporterInstance();

            describe('succeed', () => {
                thundraWrapper.reported = false;
                thundraWrapper.wrappedContext.succeed({key: 'data'});
                it('should call original context\'s succeed', () => {
                    expect(originalContext.succeed).toBeCalledWith({key: 'data'});
                });
            });

            describe('done', () => {
                thundraWrapper.reported = false;
                thundraWrapper.wrappedContext.done({err: 'error'}, {key: 'data'});
                it('should call original context\'s done', () => {
                    expect(originalContext.done).toBeCalledWith({err: 'error'}, {key: 'data'});
                });

            });

            describe('fail', () => {
                thundraWrapper.reported = false;
                thundraWrapper.wrappedContext.fail({err: 'error'});
                it('should call original context\'s fail', () => {
                    expect(originalContext.fail).toBeCalledWith({err: 'error'});
                });
            });
        });


        describe('invoke', () => {
            const originalContext = createMockContext();
            const originalCallback = null;
            const originalFunction = jest.fn((event, context) => context.succeed());
            const thundraWrapper = new ThundraWrapper(originalThis, originalEvent, originalContext, originalCallback, originalFunction, plugins, pluginContext, apiKey);
            thundraWrapper.wrappedContext.succeed = jest.fn();
            thundraWrapper.report = jest.fn();
            thundraWrapper.invoke();
            it('should call original function and wrappedContext\'s succeed', () => {
                expect(originalFunction.mock.calls.length).toBe(1);
                expect(thundraWrapper.wrappedContext.succeed.mock.calls.length).toBe(1);

            });

        });
    });

});




