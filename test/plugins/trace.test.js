import Trace from '../../dist/plugins/Trace';
import { createMockPluginContext, createMockBeforeInvocationData } from '../mocks/mocks';
import { DATA_MODEL_VERSION } from '../../dist/Constants';
import TimeoutError from '../../dist/plugins/error/TimeoutError';
import ThundraTracer from '../../dist/opentracing/Tracer';

const pluginContext = createMockPluginContext();
describe('Trace', () => {

    it('should export a function', () => {
        expect(typeof Trace).toEqual('function');
    });

    describe('constructor', () => {
        const config = { opt1: 'opt1', opt2: 'opt2' };
        const tracerWithOptions = Trace(config);
        const tracerWithoutOptions = Trace();
        const tracer = Trace();
        tracer.setPluginContext(pluginContext);
        it('should create an instance with options', () => {
            expect(tracerWithOptions.config).toEqual(config);
        });
        it('should create an instance without options', () => {
            expect(tracerWithoutOptions.options).toBeUndefined();

        });
        it('should set variables', () => {
            expect(tracer.hooks).toBeTruthy();
        });
        it('should not have new HOOKS', () => {
            expect(tracer.hooks).toEqual({
                'before-invocation': tracer.beforeInvocation,
                'after-invocation': tracer.afterInvocation
            });
        });
        it('Should set dataType correctly', () => {
            expect(tracer.dataType).toEqual('AuditData');
        });
        it('Should set tracer correctly', () => {
            expect(tracer.tracer instanceof ThundraTracer).toBeTruthy();
        });
    });

    describe('constructor with trace def', () => {
        const configs = {
            traceDef: [{
                pattern: './libs/business1',
                traceArgs: true,
                traceReturnValue: true,
                traceError: true,
            }, {
                pattern: './libs/folder/business2',
                traceArgs: false,
                traceReturnValue: false,
                traceError: false,
            }]
        };

        const tracePluginWithOptions = Trace(configs);
        it('Should set tracer config correctly', () => {
            expect(tracePluginWithOptions.config.traceDef).toBeTruthy();
            expect(tracePluginWithOptions.config.traceDef.length).toBe(2);
            expect(tracePluginWithOptions.config.traceDef[0].pattern).toEqual(configs.traceDef[0].pattern);
            expect(tracePluginWithOptions.config.traceDef[0].traceArgs).toEqual(configs.traceDef[0].traceArgs);
            expect(tracePluginWithOptions.config.traceDef[0].traceError).toEqual(configs.traceDef[0].traceError);
        });

    });

    describe('setPluginContext', () => {
        const trace = Trace();
        trace.setPluginContext(pluginContext);
        it('Should set apiKey and pluginContext', () => {
            expect(trace.apiKey).toEqual(pluginContext.apiKey);
            expect(trace.pluginContext).toEqual(pluginContext);
        });
    });

    describe('disable request and response', () => {
        const tracer = Trace({
            disableRequest: true,
            disableResponse: true
        });
        tracer.setPluginContext(pluginContext);
        const beforeInvocationData = createMockBeforeInvocationData();
        const afterInvocationData = {
            response: { key: 'data' }
        };
        tracer.report = jest.fn();
        tracer.beforeInvocation(beforeInvocationData);
        tracer.afterInvocation(afterInvocationData);
        it('should not add request and response to traceData', () => {
            expect(tracer.traceData.properties.request).toBe(null);
            expect(tracer.traceData.properties.response).toBe(null);
        });
    });

    describe('mask request and response', () => {
        const value =  {
            'expected' : null
        };

        const tracer = Trace({
            maskRequest: (request) => {
                value.expected = request;
                return value;
            },

            maskResponse: (response) => {
                value.expected = response;
                return value;
            }
        });

        tracer.setPluginContext(pluginContext);
        const beforeInvocationData = createMockBeforeInvocationData();
        const afterInvocationData = {
            response: { key: 'data' }
        };
        tracer.report = jest.fn();
        tracer.beforeInvocation(beforeInvocationData);
        tracer.afterInvocation(afterInvocationData);
        it('should not add request and response to traceData', () => {
            expect(tracer.traceData.properties.request).toEqual({'expected': {'key': 'data'}});
            expect(tracer.traceData.properties.response).toEqual({'expected': {'key': 'data'}});
        });
    });

    describe('report', () => {
        const tracer = Trace();
        tracer.setPluginContext({ ...pluginContext, requestCount: 5 });
        const beforeInvocationData = createMockBeforeInvocationData();
        const afterInvocationData = { response: { key: 'data' } };
        tracer.beforeInvocation(beforeInvocationData);
        tracer.afterInvocation(afterInvocationData);

        it('should call reporter.addReport', () => {
            expect(tracer.reporter.addReport).toBeCalledWith({
                data: tracer.traceData,
                type: 'AuditData',
                apiKey: tracer.apiKey,
                dataFormatVersion: DATA_MODEL_VERSION
            });
        });
    });

    describe('beforeInvocation', () => {
        const tracer = Trace();
        tracer.setPluginContext(pluginContext);
        const beforeInvocationData = createMockBeforeInvocationData();
        tracer.beforeInvocation(beforeInvocationData);

        it('should set startTimestamp', () => {
            expect(tracer.startTimestamp).toBeTruthy();
        });

        it('should set apiKey', () => {
            expect(tracer.apiKey).toBe(pluginContext.apiKey);
        });

        it('should set reporter', () => {
            expect(tracer.reporter).toBe(beforeInvocationData.reporter);
        });

        it('should initialize traceData', () => {
            expect(tracer.traceData).toBeTruthy();
            expect(tracer.traceData.id).toBeTruthy();
            expect(tracer.traceData.transactionId).toBeTruthy();
            expect(tracer.traceData.applicationName).toEqual(beforeInvocationData.originalContext.functionName);
            expect(tracer.traceData.applicationId).toBeTruthy();
            expect(tracer.traceData.applicationVersion).toBeTruthy();
            expect(tracer.traceData.applicationProfile).toBeTruthy();
            expect(tracer.traceData.applicationType).toEqual('node');
            expect(tracer.traceData.duration).toEqual(null);
            expect(tracer.traceData.startTimestamp).toBeTruthy();
            expect(tracer.traceData.endTimestamp).toEqual(null);
            expect(tracer.traceData.errors).toEqual([]);
            expect(tracer.traceData.thrownError).toEqual(null);
            expect(tracer.traceData.contextType).toEqual('ExecutionContext');
            expect(tracer.traceData.contextName).toEqual(beforeInvocationData.originalContext.functionName);
            expect(tracer.traceData.contextId).toBeTruthy();
            expect(tracer.traceData.auditInfo).toEqual({
                contextName: beforeInvocationData.originalContext.functionName,
                id: tracer.traceData.contextId,
                openTimestamp: tracer.traceData.startTimestamp,
                closeTimestamp: 0,
                errors: [],
                thrownError: null,
                children: [],
                duration: 0,
                props: {}
            });
            expect(tracer.traceData.properties).toEqual({
                timeout: 'false',
                coldStart: pluginContext.requestCount > 0 ? 'false' : 'true',
                functionMemoryLimitInMB: beforeInvocationData.originalContext.memoryLimitInMB,
                functionRegion: pluginContext.applicationRegion,
                request: beforeInvocationData.originalEvent,
                response: null,
                functionARN: beforeInvocationData.originalContext.invokedFunctionArn,
                requestId: beforeInvocationData.originalContext.awsRequestId,
                logGroupName: beforeInvocationData.originalContext.logGroupName,
                logStreamName: beforeInvocationData.originalContext.logStreamName,
            });

        });


    });

    describe('afterInvocation without error data', () => {
        const tracer = Trace();
        tracer.generateAuditInfoFromTraces = jest.fn();
        tracer.setPluginContext(pluginContext);
        const beforeInvocationData = createMockBeforeInvocationData();
        const afterInvocationData = {
            response: { key: 'data' }
        };
        tracer.report = jest.fn();
        tracer.beforeInvocation(beforeInvocationData);
        tracer.afterInvocation(afterInvocationData);

        it('should set endTimestamp', () => {
            expect(tracer.endTimestamp).toBeTruthy();
        });

        it('should set traceData', () => {
            expect(tracer.traceData.errors).toEqual([]);
            expect(tracer.traceData.thrownError).toEqual(null);
            expect(tracer.traceData.auditInfo.errors).toEqual([]);
            expect(tracer.traceData.auditInfo.thrownError).toEqual(null);
            expect(tracer.traceData.properties.response).toEqual({ key: 'data' });
            expect(tracer.traceData.endTimestamp).toBeTruthy();
            expect(tracer.traceData.endTimestamp).toEqual(tracer.traceData.auditInfo.closeTimestamp);
            expect(tracer.traceData.duration).toEqual(tracer.endTimestamp - tracer.startTimestamp);
        });

        it('should call generateAuditInfoFromTraces', () => {
            expect(tracer.generateAuditInfoFromTraces.mock.calls.length).toBe(1);
        });

        it('should call report', () => {
            expect(tracer.report).toBeCalledWith({
                data: tracer.traceData,
                type: 'AuditData',
                apiKey: tracer.apiKey,
                dataFormatVersion: DATA_MODEL_VERSION
            });
        });

    });

    describe('afterInvocation with error data', () => {
        const tracer = Trace();
        tracer.setPluginContext(pluginContext);
        const beforeInvocationData = createMockBeforeInvocationData();
        const afterInvocationData = {
            error: Error('error message'),
            response: { key: 'data' }
        };
        tracer.report = jest.fn();
        tracer.beforeInvocation(beforeInvocationData);
        tracer.afterInvocation(afterInvocationData);

        it('should set endTimestamp', () => {
            expect(tracer.endTimestamp).toBeTruthy();
        });

        it('should set traceData', () => {
            expect(tracer.traceData.errors).toEqual(['Error']);
            expect(tracer.traceData.thrownError).toEqual('Error');
            expect(tracer.traceData.auditInfo.errors).toEqual([{
                errorMessage: 'error message',
                errorType: 'Error'
            }]);
            expect(tracer.traceData.auditInfo.thrownError).toEqual({
                errorMessage: 'error message',
                errorType: 'Error'
            });
            expect(tracer.traceData.properties.response).toEqual({
                errorMessage: 'error message',
                errorType: 'Error'
            });
            expect(tracer.traceData.endTimestamp).toBeTruthy();
            expect(tracer.traceData.endTimestamp).toEqual(tracer.traceData.auditInfo.closeTimestamp);
            expect(tracer.traceData.duration).toEqual(tracer.endTimestamp - tracer.startTimestamp);
        });

        it('should call report', () => {
            expect(tracer.report).toBeCalledWith({
                data: tracer.traceData,
                type: 'AuditData',
                apiKey: tracer.apiKey,
                dataFormatVersion: DATA_MODEL_VERSION
            });
        });

    });

    describe('afterInvocation with error data', () => {
        const tracer = new ThundraTracer({});
        const tracePlugin = Trace();

        const parentSpan = tracer.startSpan('parent');
        parentSpan.setTag('tag-key', 'tagValue');
        parentSpan.log({ 'test-log': 'logValue' });

        const childSpan = tracer.startSpan('child', { childOf: parentSpan });

        childSpan.finish();
        parentSpan.finish();

        const auditInfos = tracePlugin.generateAuditInfoFromTraces(tracer.recorder.spanTree);

        it('should set log and tag relations', () => {
            expect(auditInfos[0].children.length).toBe(1);
            expect(auditInfos[0].props).toEqual({ 'LOGS': [parentSpan.logs[0]], 'tag-key': 'tagValue' });
        });
    });

    describe('afterInvocation with TimeoutError', () => {
        const tracer = Trace();
        tracer.setPluginContext(pluginContext);
        const beforeInvocationData = createMockBeforeInvocationData();
        const afterInvocationData = {
            error: new TimeoutError('error message'),
            response: null
        };
        tracer.report = jest.fn();
        tracer.beforeInvocation(beforeInvocationData);
        tracer.afterInvocation(afterInvocationData);

        it('should set Timeout true', () => {
            expect(tracer.traceData.properties.timeout).toBeTruthy();
        });
    });
});