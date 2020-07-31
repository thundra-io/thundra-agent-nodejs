import Trace from '../../dist/plugins/Trace';
import ExecutionContextManager from '../../dist/context/ExecutionContextManager';
import InvocationSupport from '../../dist/plugins/support/InvocationSupport';
import InvocationTraceSupport from '../../dist/plugins/support/InvocationTraceSupport';
import TraceConfig from '../../dist/plugins/config/TraceConfig';
import * as LambdaExecutor from '../../dist/wrappers/lambda/LambdaExecutor';
import {
    createMockPluginContext, createMockApiGatewayProxy, createMockLambdaExecContext,
    createMockSNSEvent, createMockSQSEvent, createMockClientContext, createBatchMockSQSEventDifferentIds,
    createBatchMockSQSEventSameIds, createBatchMockSNSEventWithDifferentIds, createBatchMockSNSEventWithSameIds
} from '../mocks/mocks';
import * as mockAWSEvents from '../mocks/aws.events.mocks';
import { ApplicationManager } from '../../dist/application/ApplicationManager';
import { LambdaApplicationInfoProvider } from '../../dist/wrappers/lambda/LambdaApplicationInfoProvider';

const md5 = require('md5');
const flatten = require('lodash.flatten');

ApplicationManager.setApplicationInfoProvider(new LambdaApplicationInfoProvider());

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

    describe('mask request and response', () => {
        const value = {
            'expected': null
        };

        const trace = new Trace(new TraceConfig({
            maskRequest: (request) => {
                value.expected = request;
                return value;
            },

            maskResponse: (response) => {
                value.expected = response;
                return value;
            }
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

            expect(rootSpan.tags['aws.lambda.invocation.request']).toEqual({ 'expected': { 'key': 'data' } });
            expect(rootSpan.tags['aws.lambda.invocation.response']).toEqual({ 'expected': { 'key': 'data' } });
        });
    });

    describe('before invocation', () => {
        const traceConfig = new TraceConfig();
        const trace = new Trace(traceConfig);
        const mockPluginContext = createMockPluginContext();
        mockPluginContext.executor = {
            startTrace: jest.fn(),
        };

        trace.setPluginContext(mockPluginContext);
        it('should call executor', () => {
            const mockExecContext = createMockLambdaExecContext();
            ExecutionContextManager.set(mockExecContext);

            trace.beforeInvocation(mockExecContext);

            expect(mockPluginContext.executor.startTrace).toHaveBeenCalledTimes(1);
            expect(mockPluginContext.executor.startTrace).toHaveBeenCalledWith(mockPluginContext, mockExecContext, traceConfig);
        });
    });

    describe('before invocation with SQS event', () => {
        const trace = new Trace(new TraceConfig());
        const mockPluginContext = createMockPluginContext();
        mockPluginContext.executor = LambdaExecutor;
        trace.setPluginContext(mockPluginContext);

        it('should set propagated ids in plugin context', () => {
            const mockExecContext = createMockLambdaExecContext();
            mockExecContext.platformData.originalEvent = createMockSQSEvent();
            ExecutionContextManager.set(mockExecContext);

            trace.beforeInvocation(mockExecContext);

            expect(mockExecContext.transactionId).toBeTruthy();
            expect(mockExecContext.traceId).toBe('traceId');
            expect(mockExecContext.spanId).toBeTruthy();
        });
    });

    describe('before invocation with batch SQS event from multiple triggers', () => {
        const trace = new Trace(new TraceConfig());
        const mockPluginContext = createMockPluginContext();
        mockPluginContext.executor = LambdaExecutor;
        trace.setPluginContext(mockPluginContext);

        it('should set propagated ids in plugin context', () => {
            const mockExecContext = createMockLambdaExecContext();
            mockExecContext.platformData.originalEvent = createBatchMockSQSEventDifferentIds();
            ExecutionContextManager.set(mockExecContext);

            trace.beforeInvocation(mockExecContext);

            expect(mockExecContext.transactionId).toBeTruthy();
            expect(mockExecContext.traceId).not.toBe('traceId');
            expect(mockExecContext.spanId).not.toBe('spanId');
        });
    });

    describe('before invocation with batch SQS event from same trigger', () => {
        const trace = new Trace(new TraceConfig());
        const mockPluginContext = createMockPluginContext();
        mockPluginContext.executor = LambdaExecutor;
        trace.setPluginContext(mockPluginContext);

        it('should set propagated ids in plugin context', () => {
            const mockExecContext = createMockLambdaExecContext();
            mockExecContext.platformData.originalEvent = createBatchMockSQSEventSameIds();
            ExecutionContextManager.set(mockExecContext);

            trace.beforeInvocation(mockExecContext);

            expect(mockExecContext.transactionId).toBeTruthy();
            expect(mockExecContext.traceId).toBe('traceId');
            expect(mockExecContext.spanId).toBeTruthy();
        });
    });

    describe('before invocation with SNS event', () => {
        const trace = new Trace(new TraceConfig());
        const mockPluginContext = createMockPluginContext();
        mockPluginContext.executor = LambdaExecutor;
        trace.setPluginContext(mockPluginContext);

        it('should set propagated ids in plugin context', () => {
            const mockExecContext = createMockLambdaExecContext();
            mockExecContext.platformData.originalEvent = createMockSNSEvent();
            ExecutionContextManager.set(mockExecContext);

            trace.beforeInvocation(mockExecContext);

            expect(mockExecContext.transactionId).toBeTruthy();
            expect(mockExecContext.traceId).toBe('traceId');
            expect(mockExecContext.spanId).toBeTruthy();
        });
    });


    describe('before invocation with batch SNS event from multiple triggers', () => {
        const trace = new Trace(new TraceConfig());
        const mockPluginContext = createMockPluginContext();
        mockPluginContext.executor = LambdaExecutor;
        trace.setPluginContext(mockPluginContext);

        it('should set propagated ids in plugin context', () => {
            const mockExecContext = createMockLambdaExecContext();
            mockExecContext.platformData.originalEvent = createBatchMockSNSEventWithDifferentIds();
            ExecutionContextManager.set(mockExecContext);

            trace.beforeInvocation(mockExecContext);

            expect(mockExecContext.transactionId).not.toBe('transactionId');
            expect(mockExecContext.traceId).not.toBe('traceId');
            expect(mockExecContext.spanId).not.toBe('spanId');
        });
    });

    describe('before invocation with batch SNS event from same trigger', () => {
        const trace = new Trace(new TraceConfig());
        const mockPluginContext = createMockPluginContext();
        mockPluginContext.executor = LambdaExecutor;
        trace.setPluginContext(mockPluginContext);

        it('should set propagated ids in plugin context', () => {
            const mockExecContext = createMockLambdaExecContext();
            mockExecContext.platformData.originalEvent = createBatchMockSNSEventWithSameIds();
            ExecutionContextManager.set(mockExecContext);

            trace.beforeInvocation(mockExecContext);

            expect(mockExecContext.transactionId).toBeTruthy();
            expect(mockExecContext.traceId).toBe('traceId');
            expect(mockExecContext.spanId).toBeTruthy();
        });
    });

    describe('before invocation with ApiGateway event', () => {
        const trace = new Trace(new TraceConfig());
        const mockPluginContext = createMockPluginContext();
        mockPluginContext.executor = LambdaExecutor;
        trace.setPluginContext(mockPluginContext);

        it('should set propagated ids in plugin context', () => {
            const mockExecContext = createMockLambdaExecContext();
            mockExecContext.platformData.originalEvent = createMockApiGatewayProxy();
            ExecutionContextManager.set(mockExecContext);

            trace.beforeInvocation(mockExecContext);

            expect(mockExecContext.transactionId).toBeTruthy();
            expect(mockExecContext.traceId).toBe('traceId');
            expect(mockExecContext.spanId).toBeTruthy();
        });
    });

    describe('before invocation with Lambda trigger', () => {
        const trace = new Trace(new TraceConfig());
        const mockPluginContext = createMockPluginContext();
        mockPluginContext.executor = LambdaExecutor;
        trace.setPluginContext(mockPluginContext);

        it('should set propagated ids in plugin context', () => {
            const mockExecContext = createMockLambdaExecContext();
            mockExecContext.platformData.originalContext.clientContext = createMockClientContext();
            ExecutionContextManager.set(mockExecContext);

            trace.beforeInvocation(mockExecContext);

            expect(mockExecContext.transactionId).toBeTruthy();
            expect(mockExecContext.traceId).toBe('traceId');
            expect(mockExecContext.spanId).toBeTruthy();
        });
    });

    describe('before invocation with Kinesis event ', () => {
        const trace = new Trace(new TraceConfig());
        const mockPluginContext = createMockPluginContext();
        mockPluginContext.executor = LambdaExecutor;
        trace.setPluginContext(mockPluginContext);
        const mockExecContext = createMockLambdaExecContext();
        mockExecContext.platformData.originalEvent = mockAWSEvents.createMockKinesisEvent();

        beforeAll(() => { 
            ExecutionContextManager.set(mockExecContext); 
            trace.beforeInvocation(mockExecContext);
        });

        it('should set trigger tags for Kinesis to root span', () => {
            const { rootSpan } = mockExecContext;

            expect(rootSpan.tags['trigger.domainName']).toBe('Stream');
            expect(rootSpan.tags['trigger.className']).toBe('AWS-Kinesis');
            expect(rootSpan.tags['trigger.operationNames']).toEqual(['example_stream']);
        });

        it('should create incoming kinesis trace links', () => {
            const expTraceLinks = ['eu-west-2:example_stream:shardId-000000000000:49545115243490985018280067714973144582180062593244200961'];
            expect(InvocationTraceSupport.getIncomingTraceLinks()).toEqual(expTraceLinks);
        });
    });

    describe('before invocation with Firehose event ', () => {
        const trace = new Trace(new TraceConfig());
        const mockPluginContext = createMockPluginContext();
        mockPluginContext.executor = LambdaExecutor;
        trace.setPluginContext(mockPluginContext);
        const mockExecContext = createMockLambdaExecContext();
        mockExecContext.platformData.originalEvent = mockAWSEvents.createMockFirehoseEvent();

        beforeAll(() => { 
            ExecutionContextManager.set(mockExecContext); 
            trace.beforeInvocation(mockExecContext);
        });

        it('should set trigger tags for FireHose to root span', () => {
            const { rootSpan } = mockExecContext;

            expect(rootSpan.tags['trigger.domainName']).toBe('Stream');
            expect(rootSpan.tags['trigger.className']).toBe('AWS-Firehose');
            expect(rootSpan.tags['trigger.operationNames']).toEqual(['exampleStream']);
        });

        it('should create incoming firehose trace links', () => {
            const expTraceLinks = [
                'eu-west-2:exampleStream:1495072948:75c5afa1146857f64e92e6bb6e561ded',
                'eu-west-2:exampleStream:1495072949:75c5afa1146857f64e92e6bb6e561ded',
                'eu-west-2:exampleStream:1495072950:75c5afa1146857f64e92e6bb6e561ded',
            ];
            expect(InvocationTraceSupport.getIncomingTraceLinks().sort()).toEqual(expTraceLinks.sort());
        });
    });

    describe('before invocation with DynamoDB event ', () => {
        const trace = new Trace(new TraceConfig());
        const mockPluginContext = createMockPluginContext();
        mockPluginContext.executor = LambdaExecutor;
        trace.setPluginContext(mockPluginContext);
        const mockExecContext = createMockLambdaExecContext();
        mockExecContext.platformData.originalEvent = mockAWSEvents.createMockDynamoDBEvent();

        beforeAll(() => { 
            ExecutionContextManager.set(mockExecContext); 
            trace.beforeInvocation(mockExecContext);
        });

        it('should set trigger tags for DynamoDB to root span', () => {
            expect(InvocationSupport.getAgentTag('trigger.domainName')).toBe('DB');
            expect(InvocationSupport.getAgentTag('trigger.className')).toBe('AWS-DynamoDB');
            expect(InvocationSupport.getAgentTag('trigger.operationNames')).toEqual(['ExampleTableWithStream']);
        });

        it('should create incoming dynamodb trace links', () => {
            const region = 'eu-west-2';
            const keyHash = md5('Id={N: 101}');
            const newItemHash = md5('Id={N: 101}, Message={S: New item!}');
            const updatedItemHash = md5('Id={N: 101}, Message={S: This item has changed}');
            const tableName = 'ExampleTableWithStream';
            const timestamp = 1480642019;

            const expTraceLinks = flatten([0, 1, 2].map((i) => {
                return [
                    `${region}:${tableName}:${timestamp + i}:DELETE:${keyHash}`,
                    `${region}:${tableName}:${timestamp + i}:SAVE:${keyHash}`,
                    `${region}:${tableName}:${timestamp + i}:SAVE:${newItemHash}`,
                    `${region}:${tableName}:${timestamp + i}:SAVE:${updatedItemHash}`,
                ];
            }));
            expect(InvocationTraceSupport.getIncomingTraceLinks().sort()).toEqual(expTraceLinks.sort());
        });
    });

    describe('before invocation with SNS event ', () => {
        const trace = new Trace(new TraceConfig());
        const mockPluginContext = createMockPluginContext();
        mockPluginContext.executor = LambdaExecutor;
        trace.setPluginContext(mockPluginContext);
        const mockExecContext = createMockLambdaExecContext();
        mockExecContext.platformData.originalEvent = mockAWSEvents.createMockSNSEvent();

        beforeAll(() => { 
            ExecutionContextManager.set(mockExecContext); 
            trace.beforeInvocation(mockExecContext);
        });

        it('should set trigger tags for SNS to root span', () => {
            const { rootSpan } = mockExecContext;

            expect(rootSpan.tags['trigger.domainName']).toBe('Messaging');
            expect(rootSpan.tags['trigger.className']).toBe('AWS-SNS');
            expect(rootSpan.tags['trigger.operationNames']).toEqual(['ExampleTopic']);
        });

        it('should create incoming sns trace links', () => {
            const expTraceLinks = ['95df01b4-ee98-5cb9-9903-4c221d41eb5e'];
            expect(InvocationTraceSupport.getIncomingTraceLinks()).toEqual(expTraceLinks);
        });
    });

    describe('before invocation with SQS event ', () => {
        const trace = new Trace(new TraceConfig());
        const mockPluginContext = createMockPluginContext();
        mockPluginContext.executor = LambdaExecutor;
        trace.setPluginContext(mockPluginContext);
        const mockExecContext = createMockLambdaExecContext();
        mockExecContext.platformData.originalEvent = mockAWSEvents.createMockSQSEvent();

        beforeAll(() => { 
            ExecutionContextManager.set(mockExecContext); 
            trace.beforeInvocation(mockExecContext);
        });

        it('should set trigger tags for SNS to root span', () => {
            const { rootSpan } = mockExecContext;

            expect(rootSpan.tags['trigger.domainName']).toBe('Messaging');
            expect(rootSpan.tags['trigger.className']).toBe('AWS-SQS');
            expect(rootSpan.tags['trigger.operationNames']).toEqual(['MyQueue']);
        });

        it('should create incoming sqs trace links', () => {
            const expTraceLinks = ['19dd0b57-b21e-4ac1-bd88-01bbb068cb78'];
            expect(InvocationTraceSupport.getIncomingTraceLinks()).toEqual(expTraceLinks);
        });
    });

    describe('before invocation with S3 event ', () => {
        const trace = new Trace(new TraceConfig());
        const mockPluginContext = createMockPluginContext();
        mockPluginContext.executor = LambdaExecutor;
        trace.setPluginContext(mockPluginContext);
        const mockExecContext = createMockLambdaExecContext();
        mockExecContext.platformData.originalEvent = mockAWSEvents.createMockS3Event();

        beforeAll(() => { 
            ExecutionContextManager.set(mockExecContext); 
            trace.beforeInvocation(mockExecContext);
        });

        it('should set trigger tags for S3 to root span', () => {
            const { rootSpan } = mockExecContext;

            expect(rootSpan.tags['trigger.domainName']).toBe('Storage');
            expect(rootSpan.tags['trigger.className']).toBe('AWS-S3');
            expect(rootSpan.tags['trigger.operationNames']).toEqual(['example-bucket']);

        });

        it('should create incoming s3 trace links', () => {
            const expTraceLinks = ['EXAMPLE123456789'];
            expect(InvocationTraceSupport.getIncomingTraceLinks()).toEqual(expTraceLinks);
        });
    });

    describe('before invocation with CloudWatchSchedule event ', () => {
        const trace = new Trace(new TraceConfig());
        const mockPluginContext = createMockPluginContext();
        mockPluginContext.executor = LambdaExecutor;
        trace.setPluginContext(mockPluginContext);
        const mockExecContext = createMockLambdaExecContext();
        mockExecContext.platformData.originalEvent = mockAWSEvents.createMockCloudWatchScheduledEvent();

        beforeAll(() => { 
            ExecutionContextManager.set(mockExecContext); 
            trace.beforeInvocation(mockExecContext);
        });

        it('should set trigger tags for CloudWatchSchedule to root span', () => {
            const { rootSpan } = mockExecContext;

            expect(rootSpan.tags['trigger.domainName']).toBe('Schedule');
            expect(rootSpan.tags['trigger.className']).toBe('AWS-CloudWatch-Schedule');
            expect(rootSpan.tags['trigger.operationNames']).toEqual(['ExampleRule']);
        });
    });

    describe('before invocation with CloudWatchLog event ', () => {
        const trace = new Trace(new TraceConfig());
        const mockPluginContext = createMockPluginContext();
        mockPluginContext.executor = LambdaExecutor;
        trace.setPluginContext(mockPluginContext);
        const mockExecContext = createMockLambdaExecContext();
        mockExecContext.platformData.originalEvent = mockAWSEvents.createMockCloudWatchLogEvent();

        beforeAll(() => { 
            ExecutionContextManager.set(mockExecContext); 
            trace.beforeInvocation(mockExecContext);
        });

        it('should set trigger tags for CloudWatchLog to root span', () => {
            const { rootSpan } = mockExecContext;

            expect(rootSpan.tags['trigger.domainName']).toBe('Log');
            expect(rootSpan.tags['trigger.className']).toBe('AWS-CloudWatch-Log');
            expect(rootSpan.tags['trigger.operationNames']).toEqual(['testLogGroup']);
        });
    });

    describe('before invocation with CloudFront event ', () => {
        const trace = new Trace(new TraceConfig());
        const mockPluginContext = createMockPluginContext();
        mockPluginContext.executor = LambdaExecutor;
        trace.setPluginContext(mockPluginContext);
        const mockExecContext = createMockLambdaExecContext();
        mockExecContext.platformData.originalEvent = mockAWSEvents.createMockCloudFrontEvent();

        beforeAll(() => { 
            ExecutionContextManager.set(mockExecContext); 
            trace.beforeInvocation(mockExecContext);
        });

        it('should set trigger tags for CloudFront to root span', () => {
            const { rootSpan } = mockExecContext;

            expect(rootSpan.tags['trigger.domainName']).toBe('CDN');
            expect(rootSpan.tags['trigger.className']).toBe('AWS-CloudFront');
            expect(rootSpan.tags['trigger.operationNames']).toEqual(['/test']);
        });
    });

    describe('before invocation with APIGatewayProxy event ', () => {
        const trace = new Trace(new TraceConfig());
        const mockPluginContext = createMockPluginContext();
        mockPluginContext.executor = LambdaExecutor;
        trace.setPluginContext(mockPluginContext);
        const mockExecContext = createMockLambdaExecContext();
        mockExecContext.platformData.originalEvent = mockAWSEvents.createMockAPIGatewayProxyEvent();

        beforeAll(() => { 
            ExecutionContextManager.set(mockExecContext); 
            trace.beforeInvocation(mockExecContext);
        });

        it('should set trigger tags for APIGatewayProxy to root span', () => {
            const { rootSpan } = mockExecContext;
            
            expect(rootSpan.tags['trigger.domainName']).toBe('API');
            expect(rootSpan.tags['trigger.className']).toBe('AWS-APIGateway');
            expect(rootSpan.tags['trigger.operationNames']).toEqual(['/{proxy+}']);
        });

        it('should create incoming apigateway trace links', () => {
            const expTraceLinks = ['spanId'];
            expect(InvocationTraceSupport.getIncomingTraceLinks()).toEqual(expTraceLinks);
        });
    });

    describe('before invocation with APIGatewayPassThrough event ', () => {
        const trace = new Trace(new TraceConfig());
        const mockPluginContext = createMockPluginContext();
        mockPluginContext.executor = LambdaExecutor;
        trace.setPluginContext(mockPluginContext);
        const mockExecContext = createMockLambdaExecContext();
        mockExecContext.platformData.originalEvent = mockAWSEvents.createMockAPIGatewayPassThroughRequest();

        beforeAll(() => { 
            ExecutionContextManager.set(mockExecContext); 
            trace.beforeInvocation(mockExecContext);
        });

        it('should set trigger tags for APIGatewayProxy to root span', () => {
            const { rootSpan } = mockExecContext;

            expect(rootSpan.tags['trigger.domainName']).toBe('API');
            expect(rootSpan.tags['trigger.className']).toBe('AWS-APIGateway');
            expect(rootSpan.tags['trigger.operationNames']).toEqual(['random.execute-api.us-west-2.amazonaws.com/dev/hello']);
        });
    });


    describe('before invocation with Lambda event', () => {
        const trace = new Trace(new TraceConfig());
        const mockPluginContext = createMockPluginContext();
        mockPluginContext.executor = LambdaExecutor;
        trace.setPluginContext(mockPluginContext);
        const mockExecContext = createMockLambdaExecContext();
        mockExecContext.platformData.originalContext.clientContext = createMockClientContext();

        beforeAll(() => { 
            ExecutionContextManager.set(mockExecContext); 
            trace.beforeInvocation(mockExecContext);
        });

        it('should set trigger tags for Lambda to root span', () => {
            const { rootSpan } = mockExecContext;

            expect(rootSpan.tags['trigger.domainName']).toBe('API');
            expect(rootSpan.tags['trigger.className']).toBe('AWS-Lambda');
            expect(rootSpan.tags['trigger.operationNames']).toEqual(['lambda-function']);
        });

        it('should create incoming lambda trace links', () => {
            const expTraceLinks = ['awsRequestId'];
            expect(InvocationTraceSupport.getIncomingTraceLinks()).toEqual(expTraceLinks);
        });
    });

    // describe('after invocation without error data', () => {
    //     const tracer = new Trace(new TraceConfig());
    //     tracer.generateAuditInfoFromTraces = jest.fn();
    //     tracer.setPluginContext(pluginContext);
    //     const beforeInvocationData = createMockBeforeInvocationData();
    //     const afterInvocationData = {
    //         response: { key: 'data' }
    //     };
    //     tracer.report = jest.fn();
    //     tracer.beforeInvocation(beforeInvocationData);
    //     tracer.afterInvocation(afterInvocationData);

    //     it('should set finishTimestamp', () => {
    //         expect(tracer.finishTimestamp).toBeTruthy();
    //     });

    //     const rootSpanData = tracer.buildSpanData(tracer.rootSpan, tracer.pluginContext);

    //     it('should call report', () => {
    //         expect(tracer.report).toBeCalledWith({
    //             data: rootSpanData,
    //             type: 'Span',
    //             apiKey: tracer.apiKey,
    //             dataModelVersion: DATA_MODEL_VERSION
    //         });
    //     });

    // });

    // describe('after invocation with error data', () => {
    //     const tracer = new Trace(new TraceConfig());
    //     tracer.setPluginContext(pluginContext);
    //     const beforeInvocationData = createMockBeforeInvocationData();
    //     const testError = Error('error message');
    //     const afterInvocationData = {
    //         error: testError,
    //         response: { key: 'data' }
    //     };
    //     tracer.report = jest.fn();
    //     tracer.beforeInvocation(beforeInvocationData);
    //     tracer.afterInvocation(afterInvocationData);

    //     it('should set finishTimestamp', () => {
    //         expect(tracer.finishTimestamp).toBeTruthy();
    //     });

    //     it('should set rootSpan', () => {
    //         expect(tracer.rootSpan.tags['aws.lambda.invocation.response']).toEqual({
    //             errorMessage: 'error message',
    //             errorType: 'Error',
    //             code: 0,
    //             stack: testError.stack
    //         });
    //     });
    // });

});
