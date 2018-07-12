import Invocation from '../../src/plugins/invocation';
import {createMockPluginContext, createMockBeforeInvocationData} from '../mocks/mocks';
import {DATA_FORMAT_VERSION, TimeoutError} from '../../src/constants';

const pluginContext = createMockPluginContext();

describe('Invocation', () => {

    describe('Export', () => {
        const options = {opt1: 'opt1', opt2: 'opt2'};
        const invocation = Invocation(options);
        invocation.setPluginContext(pluginContext);
        it('should export a function which returns an object', () => {
            expect(typeof Invocation).toEqual('function');
            expect(typeof invocation).toEqual('object');
        });
        it('should be able to pass options', () => {
            expect(invocation.options).toEqual(options);
        });
    });

    describe('constructor', () => {
        const invocation = Invocation();
        it('Should have the same HOOKS', () => {
            expect(invocation.hooks).toEqual({
                'before-invocation': invocation.beforeInvocation,
                'after-invocation': invocation.afterInvocation
            });
        });
        it('Should set dataType correctly', () => {
            expect(invocation.dataType).toEqual('InvocationData');
        });
    });


    describe('setPluginContext', () => {
        const invocation = Invocation();
        invocation.setPluginContext(pluginContext);
        it('Should set apiKey and pluginContext', () => {
            expect(invocation.apiKey).toEqual(pluginContext.apiKey);
            expect(invocation.pluginContext).toEqual(pluginContext);
        });
    });

    describe('beforeInvocation', () => {
        const invocation = Invocation();
        invocation.setPluginContext(pluginContext);
        const beforeInvocationData = createMockBeforeInvocationData();
        it('Should set variables to their initial value', async () => {
            await invocation.beforeInvocation(beforeInvocationData);
            expect(invocation.reporter).toBe(beforeInvocationData.reporter);
            expect(invocation.apiKey).toBe(pluginContext.apiKey);
            expect(invocation.invocationData.id).toBeTruthy();
            expect(invocation.invocationData.transactionId).toEqual(beforeInvocationData.transactionId);
            expect(invocation.invocationData.applicationName).toEqual(beforeInvocationData.originalContext.functionName);
            expect(invocation.invocationData.applicationId).toEqual(pluginContext.applicationId);
            expect(invocation.invocationData.applicationVersion).toEqual(pluginContext.applicationVersion);
            expect(invocation.invocationData.applicationProfile).toEqual(pluginContext.applicationProfile);
            expect(invocation.invocationData.applicationType).toEqual('node');
            expect(invocation.invocationData.duration).toEqual(null);
            expect(invocation.invocationData.startTimestamp).toEqual(invocation.startTimestamp);
            expect(invocation.invocationData.endTimestamp).toEqual(null);
            expect(invocation.invocationData.erroneous).toEqual(false);
            expect(invocation.invocationData.errorType).toEqual('');
            expect(invocation.invocationData.errorMessage).toEqual('');
            expect(invocation.invocationData.coldStart).toEqual(pluginContext.requestCount === 0);
            expect(invocation.invocationData.timeout).toEqual(false);
            expect(invocation.invocationData.region).toEqual(pluginContext.applicationRegion);
            expect(invocation.invocationData.memorySize).toEqual(parseInt(beforeInvocationData.originalContext.memoryLimitInMB));
        });
    });

    describe('afterInvocation', () => {
        const invocation = Invocation();
        invocation.setPluginContext(pluginContext);
        const afterInvocationData = {};
        invocation.report = jest.fn();
        it('Should call report method', async () => {
            await invocation.afterInvocation(afterInvocationData);
            expect(invocation.report).toHaveBeenCalledTimes(1);
        });
    });

    describe('beforeInvocation + afterInvocation', () => {
        const invocation = Invocation();
        invocation.setPluginContext(pluginContext);
        const beforeInvocationData = {...createMockBeforeInvocationData()};
        const afterInvocationData = {};
        invocation.report = jest.fn();
        it('Should call report method', async () => {
            await invocation.beforeInvocation(beforeInvocationData);
            await invocation.afterInvocation(afterInvocationData);
            expect(invocation.endTimestamp).toBeTruthy();
            expect(invocation.invocationData.duration).toEqual(invocation.endTimestamp - invocation.startTimestamp);
            expect(invocation.invocationData.erroneous).toEqual(false);
            expect(invocation.report).toHaveBeenCalledTimes(1);
        });
    });

    describe('beforeInvocation + afterInvocation with error', () => {
        const invocation = Invocation();
        invocation.setPluginContext(pluginContext);
        const beforeInvocationData = createMockBeforeInvocationData();
        const afterInvocationData = {error: Error('error message')};
        invocation.report = jest.fn();
        it('Should call report method', async () => {
            await invocation.beforeInvocation(beforeInvocationData);
            await invocation.afterInvocation(afterInvocationData);
            expect(invocation.endTimestamp).toBeTruthy();
            expect(invocation.invocationData.erroneous).toEqual(true);
            expect(invocation.invocationData.errorType).toEqual('Error');
            expect(invocation.invocationData.errorMessage).toEqual('error message');
            expect(invocation.invocationData.duration).toEqual(invocation.endTimestamp - invocation.startTimestamp);
            expect(invocation.report).toHaveBeenCalledTimes(1);
        });
    });

    describe('beforeInvocation + afterInvocation with timeouterror', () => {
        const invocation = Invocation();
        invocation.setPluginContext(pluginContext);
        const beforeInvocationData = createMockBeforeInvocationData();
        const afterInvocationData = {error: new TimeoutError('Timeout errror')};
        invocation.report = jest.fn();
        it('Should call report method', async () => {
            await invocation.beforeInvocation(beforeInvocationData);
            await invocation.afterInvocation(afterInvocationData);
            expect(invocation.invocationData.timeout).toBeTruthy();
        });
    });

    describe('report', async () => {
        const invocation = Invocation();
        invocation.setPluginContext({...pluginContext, requestCount: 5});
        const beforeInvocationData = createMockBeforeInvocationData();
        const afterInvocationData = {};
        await invocation.beforeInvocation(beforeInvocationData);
        await invocation.afterInvocation(afterInvocationData);

        it('should call reporter.addReport', () => {
            expect(invocation.reporter.addReport).toBeCalledWith({
                data: invocation.invocationData,
                type: invocation.dataType,
                apiKey: invocation.apiKey,
                dataFormatVersion: DATA_FORMAT_VERSION
            });
        });
    });


});

