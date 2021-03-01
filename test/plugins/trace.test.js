import Trace from '../../dist/plugins/Trace';
import ExecutionContextManager from '../../dist/context/ExecutionContextManager';
import InvocationSupport from '../../dist/plugins/support/InvocationSupport';
import InvocationTraceSupport from '../../dist/plugins/support/InvocationTraceSupport';
import TraceConfig from '../../dist/plugins/config/TraceConfig';
import * as LambdaExecutor from '../../dist/wrappers/lambda/LambdaExecutor';
import { ApplicationManager } from '../../dist/application/ApplicationManager';

import {
    createMockPluginContext,
    createMockLambdaExecContext,
} from '../mocks/mocks';

const md5 = require('md5');
const flatten = require('lodash.flatten');

ApplicationManager.setApplicationInfoProvider(null);

const pluginContext = createMockPluginContext();

describe('trace', () => {

    describe('constructor', () => {
        const config = new TraceConfig();
        const trace = new Trace(config);
        trace.setPluginContext(pluginContext);

        it('should create an instance with options', () => {
            expect(trace.config).toEqual(config);
        });

        it('should set variables', () => {
            expect(trace.hooks).toBeTruthy();
        });
        it('should not have new HOOKS', () => {
            expect(trace.hooks).toEqual({
                'before-invocation': trace.beforeInvocation,
                'after-invocation': trace.afterInvocation
            });
        });
    });

    describe('constructor with trace def', () => {
        const configs = new TraceConfig({
            traceableConfigs: [{
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
        });

        const tracePluginWithOptions = new Trace(configs);
        it('should set tracer config correctly', () => {
            expect(tracePluginWithOptions.config.traceableConfigs).toBeTruthy();
            expect(tracePluginWithOptions.config.traceableConfigs.length).toBe(2);
            expect(tracePluginWithOptions.config.traceableConfigs[0].pattern).toEqual(configs.traceableConfigs[0].pattern);
            expect(tracePluginWithOptions.config.traceableConfigs[0].traceArgs).toEqual(configs.traceableConfigs[0].traceArgs);
            expect(tracePluginWithOptions.config.traceableConfigs[0].traceError).toEqual(configs.traceableConfigs[0].traceError);
        });

    });

    describe('set plugin context', () => {
        const trace = new Trace(new TraceConfig());
        beforeAll(() => {
            trace.setPluginContext(pluginContext);
        });

        it('Should set apiKey and pluginContext', () => {
            expect(trace.pluginContext).toEqual(pluginContext);
        });
    });

    describe('disable request and response', () => {
        const trace = new Trace(new TraceConfig({
            disableRequest: true,
            disableResponse: true,
        }));

        const mockPluginContext = createMockPluginContext();
        mockPluginContext.executor = LambdaExecutor;
        trace.setPluginContext(mockPluginContext);

        it('should not add request and response to traceData', () => {
            const mockExecContext = createMockLambdaExecContext();
            ExecutionContextManager.set(mockExecContext);

            trace.beforeInvocation(mockExecContext);
            trace.afterInvocation(mockExecContext);

            const { rootSpan } = mockExecContext;

            expect(rootSpan.tags['aws.lambda.invocation.request']).toBe(null);
            expect(rootSpan.tags['aws.lambda.invocation.response']).toBe(null);
        });
    });
});
