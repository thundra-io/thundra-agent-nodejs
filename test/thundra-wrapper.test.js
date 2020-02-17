import ThundraWrapper from '../dist/ThundraWrapper';
import { createMockContext, createMockReporterInstance, createMockPlugin, createMockPluginContext, createMockPromise } from './mocks/mocks';
import HttpError from '../dist/plugins/error/HttpError';
import TimeoutError from '../dist/plugins/error/TimeoutError';

const pluginContext = createMockPluginContext();

jest.useFakeTimers();

describe('ThundraWrapper', () => {
    process.env.thundra_agent_lambda_report_cloudwatch_enable = 'false';
    const originalThis = this;
    const originalEvent = { key1: 'value2', key2: 'value2' };
    const originalContext = createMockContext();
    const plugins = [createMockPlugin()];
    const apiKey = '12345';

    describe('report', () => {
        const originalCallback = jest.fn();
        const originalFunction = jest.fn((e, c, cb) => callback());
        const instrumentationDisabled = false;
        const thundraWrapper = new ThundraWrapper(originalThis, originalEvent, originalContext, originalCallback, originalFunction, plugins, pluginContext, instrumentationDisabled);
        thundraWrapper.reporter = createMockReporterInstance();

        beforeAll((done) => {
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
        const instrumentationDisabled = false;
        const thundraWrapper = new ThundraWrapper(originalThis, originalEvent, originalContext, originalCallback, originalFunction, plugins, pluginContext, instrumentationDisabled);
        thundraWrapper.reporter = createMockReporterInstance();

        beforeAll((done) => {
            thundraWrapper.report(null, null, null).then(done);
        });
        it('should not fail', () => {
            expect(thundraWrapper.reported).toBeTruthy();
        });
    });

    describe('original function throws an error', () => {
        let gotErr = undefined;
        const thrownError = 'err';
        const instrumentationDisabled = false;
        const originalCallback = jest.fn();
        const originalFunction = jest.fn((e, c, cb) => {
            cb(thrownError, null);
        });
        const thundraWrapper = new ThundraWrapper(originalThis, originalEvent, originalContext, originalCallback, originalFunction, plugins, pluginContext, instrumentationDisabled);
        thundraWrapper.reporter = createMockReporterInstance();

        beforeAll(done => {
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
        const thundraWrapper = new ThundraWrapper(originalThis, originalEvent, originalContext, originalCallback, originalFunction, plugins, pluginContext, apiKey);
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
        const originalFunction = jest.fn((event, context, callback) => {callback(null, 'hey')});
        const instrumentationDisabled = false;
        originalContext.getRemainingTimeInMillis = () => 5000;
        pluginContext.timeoutMargin = 200;
        const thundraWrapper = new ThundraWrapper(originalThis, originalEvent, originalContext, originalCallback, originalFunction, plugins, pluginContext, instrumentationDisabled);
        thundraWrapper.report = jest.fn();
        jest.runAllTimers();
        originalContext.getRemainingTimeInMillis = null;
        pluginContext.timeoutMargin = null;
        it('setupTimeoutHandler calls set timeout.', () => {
            expect(thundraWrapper.report).toBeCalledWith(new TimeoutError('Lambda is timed out.'), null, null);
        });
    });

    describe('originalFunction calls callback', () => {

        describe('wrappedCallback', () => {

            describe('with mock report function', () => {
                const originalCallback = jest.fn();
                const originalFunction = jest.fn((e, c, cb) => compareBuild());
                const instrumentationDisabled = false;
                const thundraWrapper = new ThundraWrapper(originalThis, originalEvent, originalContext, originalCallback, originalFunction, plugins, pluginContext, instrumentationDisabled);
                thundraWrapper.report = jest.fn();
                thundraWrapper.wrappedCallback();
                it('should call report', () => {
                    expect(thundraWrapper.report).toBeCalled();
                });
            });

            describe('with real report function', () => {
                const originalCallback = jest.fn();
                const originalFunction = jest.fn((e, c, cb) => cb());
                const instrumentationDisabled = false;
                const thundraWrapper = new ThundraWrapper(originalThis, originalEvent, originalContext, originalCallback, originalFunction, plugins, pluginContext, instrumentationDisabled);
                thundraWrapper.reporter = createMockReporterInstance();
                thundraWrapper.wrappedCallback();
                it('should call reporter.sendReports', () => {
                    expect(thundraWrapper.reporter.sendReports).toBeCalled();
                });
            });

        });

        describe('report once', async () => {
            const originalCallback = jest.fn();
            const originalFunction = jest.fn((e, c, cb) => cb());
            const instrumentationDisabled = false;
            const thundraWrapper = new ThundraWrapper(originalThis, originalEvent, originalContext, originalCallback, originalFunction, plugins, pluginContext, instrumentationDisabled);
            thundraWrapper.reported = true;
            thundraWrapper.reporter = createMockReporterInstance();

            beforeAll(done => {
                thundraWrapper.report(null, {result: 'result'}, thundraWrapper.originalCallback).then(done);
            });
            it('should not send reports', () => {
                expect(originalCallback).not.toHaveBeenCalled();
            });
            it('should not call callback', () => {
                expect(originalCallback).not.toHaveBeenCalled();
            });
        });

        describe('AWS Lambda Proxy Response', async () => {
            const originalCallback = jest.fn();
            const originalFunction = jest.fn((e, c, cb) => cb());
            const instrumentationDisabled = false;
            const thundraWrapper = new ThundraWrapper(originalThis, originalEvent, originalContext, originalCallback, originalFunction, plugins, pluginContext, instrumentationDisabled);
            thundraWrapper.executeHook = jest.fn();
            const response = {statusCode: 500, body:'{\'message\':\'I have failed\'}'};
            thundraWrapper.wrappedCallback(null, response);
            
            it('should extract error from response with valid error response', () => {
                const expectedAfterInvocationData = {
                    error: new HttpError('Lambda returned with error response.'),
                    originalEvent,
                    response, 
                };
                expect(thundraWrapper.executeHook).toBeCalledWith('after-invocation', expectedAfterInvocationData, true);
            });

        });

        describe('AWS Lambda Proxy Response', async () => {
            const originalCallback = jest.fn();
            const originalFunction = jest.fn((e, c, cb) => cb());
            const instrumentationDisabled = false;
            const thundraWrapper = new ThundraWrapper(originalThis, originalEvent, originalContext, originalCallback, originalFunction, plugins, pluginContext, instrumentationDisabled);
            thundraWrapper.executeHook = jest.fn();
            const response = {statusCode: 500, body:{ message: 'I have failed'}};
            thundraWrapper.wrappedCallback(null, response);
            it('should extract error from response with invalid body', () => {   
                const expectedAfterInvocationData = {
                    error: new HttpError('Lambda returned with error response.'),
                    originalEvent,
                    response: response   
                };
                expect(thundraWrapper.executeHook).toBeCalledWith('after-invocation', expectedAfterInvocationData, true);
            });   
        });

        describe('AWS Lambda Proxy Response', async () => {
            const originalCallback = jest.fn();
            const originalFunction = jest.fn((e, c, cb) => cb());
            const instrumentationDisabled = false;
            const thundraWrapper = new ThundraWrapper(originalThis, originalEvent, originalContext, originalCallback, originalFunction, plugins, pluginContext, instrumentationDisabled);
            thundraWrapper.executeHook = jest.fn();
            thundraWrapper.wrappedCallback(null, {statusCode: 200, body:'{\'message\':\'I have failed\'}'});
            it('should extract error from response with success status', () => {   
                const expectedAfterInvocationData = {
                    error: null,
                    originalEvent,
                    response: {statusCode: 200, body:'{\'message\':\'I have failed\'}'}  
                };
                expect(thundraWrapper.executeHook).toBeCalledWith('after-invocation', expectedAfterInvocationData, true);
            });

        });

        describe('invoke', () => {
            const originalCallback = jest.fn();
            const originalFunction = jest.fn((e, c, cb) => cb());
            const instrumentationDisabled = false;
            const thundraWrapper = new ThundraWrapper(originalThis, originalEvent, originalContext, originalCallback, originalFunction, plugins, pluginContext, instrumentationDisabled);
            thundraWrapper.reporter = createMockReporterInstance();
            
            it('should call original function and callback once', async () => {
                await thundraWrapper.invoke();
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
            const instrumentationDisabled = false;
            const thundraWrapper = new ThundraWrapper(originalThis, originalEvent, originalContext, originalCallback, originalFunction, plugins, pluginContext, instrumentationDisabled);
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
            const instrumentationDisabled = false;
            const originalFunction = jest.fn((e, c) => c.succeed());
            const thundraWrapper = new ThundraWrapper(originalThis, originalEvent, originalContext, originalCallback, originalFunction, plugins, pluginContext, instrumentationDisabled);
            thundraWrapper.wrappedContext.succeed = jest.fn();
            thundraWrapper.invoke();

            it('should call original function and wrappedContext\'s succeed', async () => {
                expect(originalFunction).toHaveBeenCalledTimes(1);
                expect(thundraWrapper.wrappedContext.succeed).toHaveBeenCalledTimes(1);
            });
        });

    });

    describe('originalFunction returns promise', () => {
        const mockPromise = createMockPromise();
        const originalCallback = jest.fn();
        const instrumentationDisabled = false;
        const originalFunction = jest.fn((e, c) => mockPromise);
        const thundraWrapper = new ThundraWrapper(originalThis, originalEvent, originalContext, originalCallback, originalFunction, plugins, pluginContext, instrumentationDisabled);
        thundraWrapper.reporter = createMockReporterInstance();
        
        beforeAll(async (done) => {
            thundraWrapper.invoke().then(() => done());
        });

        it('should call originalCallback', () => {
            expect(originalContext.succeed).toBeCalledWith('test');
        });
        it('should call reporter.sendReports', () => {
            expect(thundraWrapper.reporter.sendReports).toBeCalled();
        });
    });

    describe('timeout sampling configured and TimeutError occurs', () => {
        const originalCallback = jest.fn();
        const originalFunction = jest.fn();
        const instrumentationDisabled = false;
        const pc = createMockPluginContext();
        originalContext.getRemainingTimeInMillis = () => 5000;
        pc.timeoutMargin = 200;
        pc.config = {
            sampleTimedOutInvocations: true
        };

        const thundraWrapper = new ThundraWrapper(originalThis, originalEvent, originalContext, originalCallback, originalFunction, plugins, pc, instrumentationDisabled);
        thundraWrapper.executeAfteInvocationAndReport = jest.fn();
        jest.runAllTimers();
        originalContext.getRemainingTimeInMillis = null;
        pc.timeoutMargin = null;
        let afterInvocationData = {
            error: new TimeoutError('Lambda is timed out.'),
            originalEvent,
            response: null,
        };

        it('should call report when it is enabled and timeout occurs.', () => {
            expect(thundraWrapper.executeAfteInvocationAndReport).toBeCalledWith(afterInvocationData);
        });
    });

    describe('timeout sampling configured and TimeoutError does not occur', () => {
        const originalCallback = jest.fn();
        const originalFunction = jest.fn((e, c, cb) => cb());
        const instrumentationDisabled = false;
        const pc = createMockPluginContext();
        pc.config = {
            sampleTimedOutInvocations: true
        };
        originalContext.getRemainingTimeInMillis = () => 0;

        const thundraWrapper = new ThundraWrapper(originalThis, originalEvent, originalContext, originalCallback, originalFunction, plugins, pc, instrumentationDisabled);
        thundraWrapper.executeAfteInvocationAndReport = jest.fn();
        thundraWrapper.report(null, {result: 'result'}, thundraWrapper.originalCallback);

        test('should not send reports', () => {
            expect(thundraWrapper.executeAfteInvocationAndReport).not.toBeCalled();
        });
    });

});
