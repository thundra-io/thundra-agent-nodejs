import Trace from '../../dist/plugins/Trace';
import ExecutionContextManager from '../../dist/context/ExecutionContextManager';
import InvocationSupport from '../../dist/plugins/support/InvocationSupport';
import InvocationTraceSupport from '../../dist/plugins/support/InvocationTraceSupport';
import TraceConfig from '../../dist/plugins/config/TraceConfig';
import * as LambdaExecutor from '../../dist/wrappers/lambda/LambdaExecutor';
import { ApplicationManager } from '../../dist/application/ApplicationManager';

import {
    createMockPluginContext, createMockApiGatewayProxy, createMockLambdaExecContext,
    createMockSNSEvent, createMockSQSEvent, createMockClientContext, createBatchMockSQSEventDifferentIds,
    createBatchMockSQSEventSameIds, createBatchMockSNSEventWithDifferentIds, createBatchMockSNSEventWithSameIds
} from '../mocks/mocks';
import * as mockAWSEvents from '../mocks/aws.events.mocks';

const md5 = require('md5');
const flatten = require('lodash.flatten');

ApplicationManager.setApplicationInfoProvider(null);

const pluginContext = createMockPluginContext();

describe.skip('trace', () => {
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
});
