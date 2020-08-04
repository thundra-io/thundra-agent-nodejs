import Invocation from '../../dist/plugins/Invocation';
import ExecutionContext from '../../dist/context/ExecutionContext';
import ExecutionContextManager from '../../dist/context/ExecutionContextManager';
import { ApplicationManager } from '../../dist/application/ApplicationManager';

import { createMockPluginContext } from '../mocks/mocks';

ApplicationManager.setApplicationInfoProvider(null);

const pluginContext = createMockPluginContext();

describe('invocation', () => {
    describe('export', () => {
        const options = { opt1: 'opt1', opt2: 'opt2' };
        const invocation = new Invocation(options);
        invocation.setPluginContext(pluginContext);
        it('should be able to pass options', () => {
            expect(invocation.options).toEqual(options);
        });
    });

    describe('constructor', () => {
        const invocation = new Invocation();
        it('should have the same hooks', () => {
            expect(invocation.hooks).toEqual({
                'before-invocation': invocation.beforeInvocation,
                'after-invocation': invocation.afterInvocation
            });
        });
    });

    describe('set plugin context', () => {
        const invocation = new Invocation();
        invocation.setPluginContext(pluginContext);
        it('should set plugin context', () => {
            expect(invocation.pluginContext).toEqual(pluginContext);
        });
    });

    describe('before invocation', () => {
        it('executor should be called with correct parameters', async () => {
            const invocation = new Invocation();
            const mockPluginContext = createMockPluginContext();

            mockPluginContext.executor = {
                startInvocation: jest.fn(),
            }

            invocation.setPluginContext(mockPluginContext);

            const mockExecContext = new ExecutionContext({});
            ExecutionContextManager.set(mockExecContext);

            invocation.beforeInvocation(mockExecContext);
            expect(mockPluginContext.executor.startInvocation).toBeCalled();
            expect(mockPluginContext.executor.startInvocation).toBeCalledWith(mockPluginContext, mockExecContext);
        });
    });

    describe('after invocation', () => {
        it('executor should be called with correct parameters', async () => {
            const invocation = new Invocation();
            const mockPluginContext = createMockPluginContext();

            mockPluginContext.executor = {
                finishInvocation: jest.fn(),
            }

            invocation.setPluginContext(mockPluginContext);

            const mockExecContext = new ExecutionContext({ invocationData: {} });
            ExecutionContextManager.set(mockExecContext);

            invocation.afterInvocation(mockExecContext);

            expect(mockPluginContext.executor.finishInvocation).toBeCalled();
            expect(mockPluginContext.executor.finishInvocation).toBeCalledWith(mockPluginContext, mockExecContext);
        });
    });

    describe('before invocation + after invocation', () => {
        it('executor should be called with correct parameters', async () => {
            const invocation = new Invocation();
            const mockPluginContext = createMockPluginContext();

            mockPluginContext.executor = {
                startInvocation: jest.fn(),
                finishInvocation: jest.fn(),
            }

            invocation.setPluginContext(mockPluginContext);

            const mockExecContext = new ExecutionContext({ invocationData: {} });
            mockExecContext.report = jest.fn();
            ExecutionContextManager.set(mockExecContext);

            invocation.beforeInvocation(mockExecContext);
            invocation.afterInvocation(mockExecContext);
            
            expect(mockPluginContext.executor.startInvocation).toHaveBeenCalledTimes(1);
            expect(mockPluginContext.executor.startInvocation).toBeCalledWith(mockPluginContext, mockExecContext);
            expect(mockPluginContext.executor.finishInvocation).toHaveBeenCalledTimes(1);
            expect(mockPluginContext.executor.finishInvocation).toBeCalledWith(mockPluginContext, mockExecContext);
            expect(mockExecContext.report).toHaveBeenCalledTimes(1);
            expect(mockExecContext.report).toHaveBeenCalledWith({
                apiKey: mockPluginContext.apiKey,
                data: {},
                type: undefined,
                dataModelVersion: '2.0',
            });
        });
    });
});
