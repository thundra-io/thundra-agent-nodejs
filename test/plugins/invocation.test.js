import Invocation from '../../dist/plugins/Invocation';
import {createMockPluginContext, createMockBeforeInvocationData} from '../mocks/mocks';
import TimeoutError from '../../dist/plugins/error/TimeoutError';
import {DATA_MODEL_VERSION, LAMBDA_APPLICATION_DOMAIN_NAME, LAMBDA_APPLICATION_CLASS_NAME, LAMBDA_FUNCTION_PLATFORM} from '../../dist/Constants';
const buildInfo = require('../../dist/BuildInfo');


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
            expect(invocation.invocationData.type).toEqual('Invocation');
            expect(invocation.invocationData.agentVersion).toEqual(buildInfo.version);
            expect(invocation.invocationData.dataModelVersion).toEqual(DATA_MODEL_VERSION);
            expect(invocation.invocationData.applicationId).toEqual(pluginContext.applicationId);
            expect(invocation.invocationData.applicationDomainName).toEqual(LAMBDA_APPLICATION_DOMAIN_NAME);
            expect(invocation.invocationData.applicationClassName).toEqual(LAMBDA_APPLICATION_CLASS_NAME);
            expect(invocation.invocationData.applicationName).toEqual(beforeInvocationData.originalContext.functionName);
            expect(invocation.invocationData.applicationVersion).toEqual(pluginContext.applicationVersion);
            expect(invocation.invocationData.applicationStage).toEqual('');
            expect(invocation.invocationData.applicationRuntime).toEqual('node');
            expect(invocation.invocationData.applicationRuntimeVersion).toEqual(process.version);
            expect(invocation.invocationData.applicationTags).toEqual({});
            expect(invocation.invocationData.duration).toEqual(0);
            expect(invocation.invocationData.startTimestamp).toEqual(invocation.startTimestamp);
            expect(invocation.invocationData.finishTimestamp).toEqual(0);
            expect(invocation.invocationData.erroneous).toEqual(false);
            expect(invocation.invocationData.errorType).toEqual('');
            expect(invocation.invocationData.errorMessage).toEqual('');
            expect(invocation.invocationData.coldStart).toEqual(pluginContext.requestCount === 0);
            expect(invocation.invocationData.timeout).toEqual(false);
            expect(invocation.invocationData.functionRegion).toEqual(pluginContext.applicationRegion);
            expect(invocation.invocationData.functionName).toEqual(beforeInvocationData.originalContext.functionName);
            expect(invocation.invocationData.functionPlatform).toEqual(LAMBDA_FUNCTION_PLATFORM);
            expect(invocation.invocationData.tags).toEqual({
                'aws.lambda.arn': 'arn:aws:lambda:us-west-2:123456789123:function:test',
                'aws.lambda.invocation.coldstart': true,
                'aws.lambda.invocation.request_id ': 'awsRequestId',
                'aws.lambda.invocation.timeout': false,
                'aws.lambda.log_group_name': '/aws/lambda/test',
                'aws.lambda.log_stream_name': '2018/03/07/[$LATEST]test',
                'aws.lambda.memory_limit': 512,
                'aws.lambda.name': 'test',
                'aws.region': 'region',
                'aws.lambda.invocation.request_id': 'awsRequestId',});
        });
    });

    describe('afterInvocation', () => {
        const invocation = Invocation();
        invocation.setPluginContext(pluginContext);
        const beforeInvocationData = createMockBeforeInvocationData();
        invocation.beforeInvocation(beforeInvocationData);

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
            expect(invocation.finishTimestamp).toBeTruthy();
            expect(invocation.invocationData.duration).toEqual(invocation.finishTimestamp - invocation.startTimestamp);
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
            expect(invocation.finishTimestamp).toBeTruthy();
            expect(invocation.invocationData.erroneous).toEqual(true);
            expect(invocation.invocationData.errorType).toEqual('Error');
            expect(invocation.invocationData.errorMessage).toEqual('error message');
            expect(invocation.invocationData.duration).toEqual(invocation.finishTimestamp - invocation.startTimestamp);
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
                dataFormatVersion: DATA_MODEL_VERSION
            });
        });
    });
});
