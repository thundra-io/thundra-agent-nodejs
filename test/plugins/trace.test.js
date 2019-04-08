import Trace from '../../dist/plugins/Trace';
import { createMockPluginContext, createMockBeforeInvocationData, createMockApiGatewayProxy,
    createMockSNSEvent, createMockSQSEvent, createMockClientContext,createBatchMockSQSEventDifferentIds,
    createBatchMockSQSEventSameIds, createBatchMockSNSEventWithDifferentIds, createBatchMockSNSEventWithSameIds } from '../mocks/mocks';
import * as mockAWSEvents from '../mocks/aws.events.mocks';    
import { DATA_MODEL_VERSION } from '../../dist/Constants';
import TimeoutError from '../../dist/plugins/error/TimeoutError';
import ThundraTracer from '../../dist/opentracing/Tracer';
import InvocationSupport from '../../dist/plugins/support/InvocationSupport';
import InvocationTraceSupport from '../../dist/plugins/support/InvocationTraceSupport';

const md5 = require('md5');
const _ = require('lodash');

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
            expect(tracer.traceData.type).toEqual('Trace');
        });
        it('Should set tracer correctly', () => {
            expect(tracer.tracer instanceof ThundraTracer).toBeTruthy();
        });
    });

    describe('constructor with trace def', () => {
        const configs = {
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
        };

        const tracePluginWithOptions = Trace(configs);
        it('Should set tracer config correctly', () => {
            expect(tracePluginWithOptions.config.traceableConfigs).toBeTruthy();
            expect(tracePluginWithOptions.config.traceableConfigs.length).toBe(2);
            expect(tracePluginWithOptions.config.traceableConfigs[0].pattern).toEqual(configs.traceableConfigs[0].pattern);
            expect(tracePluginWithOptions.config.traceableConfigs[0].traceArgs).toEqual(configs.traceableConfigs[0].traceArgs);
            expect(tracePluginWithOptions.config.traceableConfigs[0].traceError).toEqual(configs.traceableConfigs[0].traceError);
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
            expect(tracer.rootSpan.tags['aws.lambda.invocation.request']).toBe(null);
            expect(tracer.rootSpan.tags['aws.lambda.invocation.response']).toBe(null);
        });
    });

    describe('mask request and response', () => {
        const value = {
            'expected': null
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
            expect(tracer.rootSpan.tags['aws.lambda.invocation.request']).toEqual({ 'expected': { 'key': 'data' } });
            expect(tracer.rootSpan.tags['aws.lambda.invocation.response']).toEqual({ 'expected': { 'key': 'data' } });
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
                type: 'Trace',
                apiKey: tracer.apiKey,
                dataModelVersion: DATA_MODEL_VERSION
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
            expect(tracer.traceData.applicationName).toEqual(beforeInvocationData.originalContext.functionName);
            expect(tracer.traceData.applicationId).toBeTruthy();
            expect(tracer.traceData.applicationVersion).toBeTruthy();
            expect(tracer.traceData.applicationRuntime).toEqual('node');
            expect(tracer.traceData.applicationRuntimeVersion).toEqual(process.version);
            expect(tracer.traceData.startTimestamp).toBeTruthy();
            expect(tracer.traceData.finishTimestamp).toBe(undefined);
            expect(tracer.traceData.rootSpanId).toBeTruthy();
            expect(tracer.traceData.duration).toBe(undefined);
            expect(tracer.traceData.tags).toEqual({
                'aws.lambda.invocation.timeout': false,
                'aws.lambda.invocation.coldstart': pluginContext.requestCount > 0 ? false : true,
                'aws.lambda.arn': beforeInvocationData.originalContext.invokedFunctionArn,
                'aws.lambda.memory_limit': beforeInvocationData.originalContext.memoryLimitInMB,
                'aws.region': pluginContext.applicationRegion,
                'aws.lambda.name': beforeInvocationData.originalContext.functionName,
                'aws.lambda.log_group_name': beforeInvocationData.originalContext.logGroupName,
                'aws.lambda.log_stream_name': beforeInvocationData.originalContext.logStreamName,
            });
        });
    });

    describe('beforeInvocation with SQS event', () => {
        const tracer = Trace();
        const pluginContext = createMockPluginContext();

        tracer.setPluginContext(pluginContext);
        const beforeInvocationData = createMockBeforeInvocationData();
        beforeInvocationData.originalEvent = createMockSQSEvent();
        tracer.beforeInvocation(beforeInvocationData);

        it('should set propagated ids in plugin context', () => {
            expect(pluginContext.transactionId).toBe('awsRequestId');
            expect(pluginContext.traceId).toBe('traceId');
            expect(pluginContext.spanId).toBeTruthy();
        });
    });

    describe('beforeInvocation with batch SQS event from multiple triggers', () => {
        const tracer = Trace();
        const pluginContext = createMockPluginContext();

        tracer.setPluginContext(pluginContext);
        const beforeInvocationData = createMockBeforeInvocationData();
        beforeInvocationData.originalEvent = createBatchMockSQSEventDifferentIds();
        tracer.beforeInvocation(beforeInvocationData);

        it('should set propagated ids in plugin context', () => {
            expect(pluginContext.transactionId).toBe('awsRequestId');
            expect(pluginContext.traceId).not.toBe('traceId');
            expect(pluginContext.spanId).not.toBe('spanId');
        });
    });

    describe('beforeInvocation with batch SQS event from same trigger', () => {
        const tracer = Trace();
        const pluginContext = createMockPluginContext();

        tracer.setPluginContext(pluginContext);
        const beforeInvocationData = createMockBeforeInvocationData();
        beforeInvocationData.originalEvent = createBatchMockSQSEventSameIds();
        tracer.beforeInvocation(beforeInvocationData);

        it('should set propagated ids in plugin context', () => {
            expect(pluginContext.transactionId).toBe('awsRequestId');
            expect(pluginContext.traceId).toBe('traceId');
            expect(pluginContext.spanId).toBeTruthy();
        });
    });

    describe('beforeInvocation with SNS event', () => {
        const tracer = Trace();
        const pluginContext = createMockPluginContext();

        tracer.setPluginContext(pluginContext);
        const beforeInvocationData = createMockBeforeInvocationData();
        beforeInvocationData.originalEvent = createMockSNSEvent();
        tracer.beforeInvocation(beforeInvocationData);

        it('should set propagated ids in plugin context', () => {
            expect(pluginContext.transactionId).toBe('awsRequestId');
            expect(pluginContext.traceId).toBe('traceId');
            expect(pluginContext.spanId).toBeTruthy();
        });
    });


    describe('beforeInvocation with batch SNS event from multiple triggers', () => {
        const tracer = Trace();
        const pluginContext = createMockPluginContext();

        tracer.setPluginContext(pluginContext);
        const beforeInvocationData = createMockBeforeInvocationData();
        beforeInvocationData.originalEvent = createBatchMockSNSEventWithDifferentIds();
        tracer.beforeInvocation(beforeInvocationData);

        it('should set propagated ids in plugin context', () => {
            expect(pluginContext.transactionId).toBe('awsRequestId');
            expect(pluginContext.traceId).not.toBe('traceId');
            expect(pluginContext.spanId).not.toBe('spanId');
        });
    });

    describe('beforeInvocation with batch SNS event from same trigger', () => {
        const tracer = Trace();
        const pluginContext = createMockPluginContext();

        tracer.setPluginContext(pluginContext);
        const beforeInvocationData = createMockBeforeInvocationData();
        beforeInvocationData.originalEvent = createBatchMockSNSEventWithSameIds();
        tracer.beforeInvocation(beforeInvocationData);

        it('should set propagated ids in plugin context', () => {
            expect(pluginContext.transactionId).toBe('awsRequestId');
            expect(pluginContext.traceId).toBe('traceId');
            expect(pluginContext.spanId).toBeTruthy();
        });
    });

    describe('beforeInvocation with ApiGateway event', () => {
        const tracer = Trace();
        const pluginContext = createMockPluginContext();

        tracer.setPluginContext(pluginContext);
        const beforeInvocationData = createMockBeforeInvocationData();
        beforeInvocationData.originalEvent = createMockApiGatewayProxy();
        tracer.beforeInvocation(beforeInvocationData);

        it('should set propagated ids in plugin context', () => {
            expect(pluginContext.transactionId).toBe('awsRequestId');
            expect(pluginContext.traceId).toBe('traceId');
            expect(pluginContext.spanId).toBeTruthy();
        });
    });

    describe('beforeInvocation with Lambda trigger', () => {
        const tracer = Trace();
        const pluginContext = createMockPluginContext();

        tracer.setPluginContext(pluginContext);
        const beforeInvocationData = createMockBeforeInvocationData();
        beforeInvocationData.originalContext.clientContext = createMockClientContext();
        tracer.beforeInvocation(beforeInvocationData);

        it('should set propagated ids in plugin context', () => {
            expect(pluginContext.transactionId).toBe('awsRequestId');
            expect(pluginContext.traceId).toBe('traceId');
            expect(pluginContext.spanId).toBeTruthy();
        });
    });

    describe('beforeInvocation with Kinesis event ', () => {
        const tracer = Trace();
        const pluginContext = createMockPluginContext();

        tracer.setPluginContext(pluginContext);
        const beforeInvocationData = createMockBeforeInvocationData();
        beforeInvocationData.originalEvent = mockAWSEvents.createMockKinesisEvent();
        tracer.beforeInvocation(beforeInvocationData);

        it('should set trigger tags for Kinesis to root span', () => {
            expect(tracer.rootSpan.tags['trigger.domainName']).toBe('Stream');
            expect(tracer.rootSpan.tags['trigger.className']).toBe('AWS-Kinesis');
            expect(tracer.rootSpan.tags['trigger.operationNames']).toEqual([ 'arn:aws:kinesis:EXAMPLE' ]);
            expect(tracer.rootSpan.tags['topology.vertex']).toBe(true);
        });
    });

    describe('beforeInvocation with FireHose event ', () => {
        const tracer = Trace();
        const pluginContext = createMockPluginContext();

        tracer.setPluginContext(pluginContext);
        const beforeInvocationData = createMockBeforeInvocationData();
        beforeInvocationData.originalEvent = mockAWSEvents.createMockFirehoseEvent();
        tracer.beforeInvocation(beforeInvocationData);

        it('should set trigger tags for FireHose to root span', () => {
            expect(tracer.rootSpan.tags['trigger.domainName']).toBe('Stream');
            expect(tracer.rootSpan.tags['trigger.className']).toBe('AWS-Firehose');
            expect(tracer.rootSpan.tags['trigger.operationNames']).toEqual([ 'arn:aws:kinesis:EXAMPLE' ]);
            expect(tracer.rootSpan.tags['topology.vertex']).toBe(true);
        });
    });

    describe('beforeInvocation with DynamoDB event ', () => {
        const tracer = Trace();
        const pluginContext = createMockPluginContext();
        tracer.setPluginContext(pluginContext);
        const beforeInvocationData = createMockBeforeInvocationData();
        beforeInvocationData.originalEvent = mockAWSEvents.createMockDynamoDBEvent();

        beforeAll(() => {
            InvocationSupport.removeTags();
            InvocationTraceSupport.clear();
            tracer.beforeInvocation(beforeInvocationData);
        });

        it('should set trigger tags for DynamoDB to root span', () => {
            expect(InvocationSupport.getTag('trigger.domainName')).toBe('DB');
            expect(InvocationSupport.getTag('trigger.className')).toBe('AWS-DynamoDB');
            expect(InvocationSupport.getTag('trigger.operationNames')).toEqual([ 'ExampleTableWithStream' ]);
        });
        
        it('should create incoming dynamodb trace links', () => {
            const region = 'eu-west-2';
            const keyHash = md5('Id={N: 101}');
            const newItemHash = md5('Id={N: 101}, Message={S: New item!}');
            const updatedItemHash = md5('Id={N: 101}, Message={S: This item has changed}');
            const tableName = 'ExampleTableWithStream';
            const timestamp = 1480642019;

            const expIncomingTraceLinks = _.flatten([0, 1, 2].map((i) => {
                return [
                    `${region}:${tableName}:${timestamp+i}:DELETE:${keyHash}`,
                    `${region}:${tableName}:${timestamp+i}:UPDATE:${keyHash}`,
                    `${region}:${tableName}:${timestamp+i}:PUT:${newItemHash}`,
                    `${region}:${tableName}:${timestamp+i}:PUT:${updatedItemHash}`,
                ]
            }));
            expect(InvocationTraceSupport.getIncomingTraceLinks().sort()).toEqual(expIncomingTraceLinks.sort());
        });
    });

    describe('beforeInvocation with SNS event ', () => {
        const tracer = Trace();
        const pluginContext = createMockPluginContext();

        tracer.setPluginContext(pluginContext);
        const beforeInvocationData = createMockBeforeInvocationData();
        beforeInvocationData.originalEvent = mockAWSEvents.createMockSNSEvent();
        tracer.beforeInvocation(beforeInvocationData);

        it('should set trigger tags for SNS to root span', () => {
            expect(tracer.rootSpan.tags['trigger.domainName']).toBe('Messaging');
            expect(tracer.rootSpan.tags['trigger.className']).toBe('AWS-SNS');
            expect(tracer.rootSpan.tags['trigger.operationNames']).toEqual([ 'ExampleTopic' ]);
            expect(tracer.rootSpan.tags['topology.vertex']).toBe(true);
        });
    });

    describe('beforeInvocation with SQS event ', () => {
        const tracer = Trace();
        const pluginContext = createMockPluginContext();

        tracer.setPluginContext(pluginContext);
        const beforeInvocationData = createMockBeforeInvocationData();
        beforeInvocationData.originalEvent = mockAWSEvents.createMockSQSEvent();
        tracer.beforeInvocation(beforeInvocationData);

        it('should set trigger tags for SNS to root span', () => {
            expect(tracer.rootSpan.tags['trigger.domainName']).toBe('Messaging');
            expect(tracer.rootSpan.tags['trigger.className']).toBe('AWS-SQS');
            expect(tracer.rootSpan.tags['trigger.operationNames']).toEqual([ 'MyQueue' ]);
            expect(tracer.rootSpan.tags['topology.vertex']).toBe(true);
        });
    });

    describe('beforeInvocation with S3 event ', () => {
        const tracer = Trace();
        const pluginContext = createMockPluginContext();

        tracer.setPluginContext(pluginContext);
        const beforeInvocationData = createMockBeforeInvocationData();
        beforeInvocationData.originalEvent = mockAWSEvents.createMockS3Event();
        tracer.beforeInvocation(beforeInvocationData);

        it('should set trigger tags for S3 to root span', () => {
            expect(tracer.rootSpan.tags['trigger.domainName']).toBe('Storage');
            expect(tracer.rootSpan.tags['trigger.className']).toBe('AWS-S3');
            expect(tracer.rootSpan.tags['trigger.operationNames']).toEqual([ 'example-bucket' ]);
            expect(tracer.rootSpan.tags['topology.vertex']).toBe(true);
        });
    });

    describe('beforeInvocation with CloudWatchSchedule event ', () => {
        const tracer = Trace();
        const pluginContext = createMockPluginContext();

        tracer.setPluginContext(pluginContext);
        const beforeInvocationData = createMockBeforeInvocationData();
        beforeInvocationData.originalEvent = mockAWSEvents.createMockCloudWatchScheduledEvent();
        tracer.beforeInvocation(beforeInvocationData);

        it('should set trigger tags for CloudWatchSchedule to root span', () => {
            expect(tracer.rootSpan.tags['trigger.domainName']).toBe('Schedule');
            expect(tracer.rootSpan.tags['trigger.className']).toBe('AWS-CloudWatch-Schedule');
            expect(tracer.rootSpan.tags['trigger.operationNames']).toEqual([ 'ExampleRule' ]);
            expect(tracer.rootSpan.tags['topology.vertex']).toBe(true);
        });
    });

    describe('beforeInvocation with CloudWatchLog event ', () => {
        const tracer = Trace();
        const pluginContext = createMockPluginContext();

        tracer.setPluginContext(pluginContext);
        const beforeInvocationData = createMockBeforeInvocationData();
        beforeInvocationData.originalEvent = mockAWSEvents.createMockCloudWatchLogEvent();
        tracer.beforeInvocation(beforeInvocationData);

        it('should set trigger tags for CloudWatchLog to root span', () => {
            expect(tracer.rootSpan.tags['trigger.domainName']).toBe('Log');
            expect(tracer.rootSpan.tags['trigger.className']).toBe('AWS-CloudWatch-Log');
            expect(tracer.rootSpan.tags['trigger.operationNames']).toEqual([ 'testLogGroup' ]);
            expect(tracer.rootSpan.tags['topology.vertex']).toBe(true);
        });
    });

    describe('beforeInvocation with CloudFront event ', () => {
        const tracer = Trace();
        const pluginContext = createMockPluginContext();

        tracer.setPluginContext(pluginContext);
        const beforeInvocationData = createMockBeforeInvocationData();
        beforeInvocationData.originalEvent = mockAWSEvents.createMockCloudFrontEvent();
        tracer.beforeInvocation(beforeInvocationData);

        it('should set trigger tags for CloudFront to root span', () => {
            expect(tracer.rootSpan.tags['trigger.domainName']).toBe('CDN');
            expect(tracer.rootSpan.tags['trigger.className']).toBe('AWS-CloudFront');
            expect(tracer.rootSpan.tags['trigger.operationNames']).toEqual([ '/test' ]);
            expect(tracer.rootSpan.tags['topology.vertex']).toBe(true);
        });
    });

    describe('beforeInvocation with APIGatewayProxy event ', () => {
        const tracer = Trace();
        const pluginContext = createMockPluginContext();

        tracer.setPluginContext(pluginContext);
        const beforeInvocationData = createMockBeforeInvocationData();
        beforeInvocationData.originalEvent = mockAWSEvents.createMockAPIGatewayProxyEvent();
        tracer.beforeInvocation(beforeInvocationData);

        it('should set trigger tags for APIGatewayProxy to root span', () => {
            expect(tracer.rootSpan.tags['trigger.domainName']).toBe('API');
            expect(tracer.rootSpan.tags['trigger.className']).toBe('AWS-APIGateway');
            expect(tracer.rootSpan.tags['trigger.operationNames']).toEqual([ '1234567890.execute-api.us-west-2.amazonaws.com/prod/path/to/resource' ]);
            expect(tracer.rootSpan.tags['topology.vertex']).toBe(true);
        });
    });

    describe('beforeInvocation with APIGatewayPassThrough event ', () => {
        const tracer = Trace();
        const pluginContext = createMockPluginContext();

        tracer.setPluginContext(pluginContext);
        const beforeInvocationData = createMockBeforeInvocationData();
        beforeInvocationData.originalEvent = mockAWSEvents.createMockAPIGatewayPassThroughRequest();
        tracer.beforeInvocation(beforeInvocationData);

        it('should set trigger tags for APIGatewayProxy to root span', () => {
            expect(tracer.rootSpan.tags['trigger.domainName']).toBe('API');
            expect(tracer.rootSpan.tags['trigger.className']).toBe('AWS-APIGateway');
            expect(tracer.rootSpan.tags['trigger.operationNames']).toEqual([ 'random.execute-api.us-west-2.amazonaws.com/dev/hello' ]);
            expect(tracer.rootSpan.tags['topology.vertex']).toBe(true);
        });
    });


    describe('beforeInvocation with Lambda event', () => {
        const tracer = Trace();
        const pluginContext = createMockPluginContext();

        tracer.setPluginContext(pluginContext);
        const beforeInvocationData = createMockBeforeInvocationData();
        beforeInvocationData.originalContext.clientContext = createMockClientContext();
        tracer.beforeInvocation(beforeInvocationData);

        it('should set trigger tags for Lambda to root span', () => {
            expect(tracer.rootSpan.tags['trigger.domainName']).toBe('API');
            expect(tracer.rootSpan.tags['trigger.className']).toBe('AWS-Lambda');
            expect(tracer.rootSpan.tags['trigger.operationNames']).toEqual([ 'lambda-function' ]);
            expect(tracer.rootSpan.tags['topology.vertex']).toBe(true);
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
 
        it('should set finishTimestamp', () => {
            expect(tracer.finishTimestamp).toBeTruthy();
        });
 
        it('should set traceData', () => {
            expect(tracer.traceData).toBeTruthy();
            expect(tracer.traceData.id).toBeTruthy();
            expect(tracer.traceData.applicationName).toEqual(beforeInvocationData.originalContext.functionName);
            expect(tracer.traceData.applicationId).toBeTruthy();
            expect(tracer.traceData.applicationVersion).toBeTruthy();
            expect(tracer.traceData.applicationRuntime).toEqual('node');
            expect(tracer.traceData.applicationRuntimeVersion).toEqual(process.version);
            expect(tracer.traceData.startTimestamp).toBeTruthy();
            expect(tracer.traceData.finishTimestamp).toBeTruthy(undefined);
            expect(tracer.traceData.rootSpanId).toBeTruthy();
        });
 
        it('should call report', () => {
            expect(tracer.report).toBeCalledWith({
                data: tracer.traceData,
                type: 'Trace',
                apiKey: tracer.apiKey,
                dataModelVersion: DATA_MODEL_VERSION
            });
        });
 
    });
 
    describe('afterInvocation with error data', () => {
        const tracer = Trace();
        tracer.setPluginContext(pluginContext);
        const beforeInvocationData = createMockBeforeInvocationData();
        const testError = Error('error message');
        const afterInvocationData = {
            error: testError,
            response: { key: 'data' }
        };
        tracer.report = jest.fn();
        tracer.beforeInvocation(beforeInvocationData);
        tracer.afterInvocation(afterInvocationData);
 
        it('should set finishTimestamp', () => {
            expect(tracer.finishTimestamp).toBeTruthy();
        });
 
        it('should set traceData', () => {
            expect(tracer.traceData.tags.error).toEqual(true);
            
            expect(tracer.traceData.tags['error.kind']).toEqual('Error');
            expect(tracer.traceData.tags['error.message']).toEqual('error message');
            expect(tracer.rootSpan.tags['aws.lambda.invocation.response']).toEqual({
                errorMessage: 'error message',
                errorType: 'Error',
                code: 0,
                stack: testError.stack
            });
            expect(tracer.traceData.finishTimestamp).toBeTruthy();
            expect(tracer.traceData.duration).toEqual(tracer.finishTimestamp - tracer.startTimestamp);
        });
 
        it('should call report', () => {
            expect(tracer.report).toBeCalledWith({
                data: tracer.traceData,
                type: 'Trace',
                apiKey: tracer.apiKey,
                dataModelVersion: DATA_MODEL_VERSION
            });
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
            expect(tracer.traceData.tags['aws.lambda.invocation.timeout']).toBeTruthy();
        });
    });
});