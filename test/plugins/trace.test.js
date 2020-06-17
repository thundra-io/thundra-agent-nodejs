import Trace from '../../dist/plugins/Trace';
import ThundraTracer from '../../dist/opentracing/Tracer';
import InvocationSupport from '../../dist/plugins/support/InvocationSupport';
import InvocationTraceSupport from '../../dist/plugins/support/InvocationTraceSupport';
import TraceConfig from '../../dist/plugins/config/TraceConfig';
import { DATA_MODEL_VERSION } from '../../dist/Constants';

import {
    createMockPluginContext, createMockBeforeInvocationData, createMockApiGatewayProxy,
    createMockSNSEvent, createMockSQSEvent, createMockClientContext,createBatchMockSQSEventDifferentIds,
    createBatchMockSQSEventSameIds, createBatchMockSNSEventWithDifferentIds, createBatchMockSNSEventWithSameIds
} from '../mocks/mocks';
import * as mockAWSEvents from '../mocks/aws.events.mocks';
import {ApplicationManager} from '../../dist/application/ApplicationManager';
import {LambdaApplicationInfoProvider} from '../../dist/application/LambdaApplicationInfoProvider';

const md5 = require('md5');
const flatten = require('lodash.flatten');

ApplicationManager.setApplicationInfoProvider(new LambdaApplicationInfoProvider());

const pluginContext = createMockPluginContext();

describe('trace', () => {

    it('should export a function', () => {
        expect(typeof Trace).toEqual('function');
    });

    describe('constructor', () => {
        const config = new TraceConfig();
        const trace = Trace(config);
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
     
        it('Should set tracer correctly', () => {
            expect(trace.tracer instanceof ThundraTracer).toBeTruthy();
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

        const tracePluginWithOptions = Trace(configs);
        it('should set tracer config correctly', () => {
            expect(tracePluginWithOptions.config.traceableConfigs).toBeTruthy();
            expect(tracePluginWithOptions.config.traceableConfigs.length).toBe(2);
            expect(tracePluginWithOptions.config.traceableConfigs[0].pattern).toEqual(configs.traceableConfigs[0].pattern);
            expect(tracePluginWithOptions.config.traceableConfigs[0].traceArgs).toEqual(configs.traceableConfigs[0].traceArgs);
            expect(tracePluginWithOptions.config.traceableConfigs[0].traceError).toEqual(configs.traceableConfigs[0].traceError);
        });

    });

    describe('set plugin context', () => {
        const trace = Trace(new TraceConfig());
        beforeAll(() => {
            trace.setPluginContext(pluginContext);
        });

        it('Should set apiKey and pluginContext', () => {
            expect(trace.apiKey).toEqual(pluginContext.apiKey);
            expect(trace.pluginContext).toEqual(pluginContext);
        });
    });

    describe('disable request and response', () => {
        const tracer = Trace(new TraceConfig({
            disableRequest: true,
            disableResponse: true
        }));
        const beforeInvocationData = createMockBeforeInvocationData();
        const afterInvocationData = {
            response: { key: 'data' }
        };
        
        beforeAll(() => {
            tracer.report = jest.fn();
            tracer.setPluginContext(pluginContext);
            tracer.beforeInvocation(beforeInvocationData);
            tracer.afterInvocation(afterInvocationData);
        });
        it('should not add request and response to traceData', () => {
            expect(tracer.rootSpan.tags['aws.lambda.invocation.request']).toBe(null);
            expect(tracer.rootSpan.tags['aws.lambda.invocation.response']).toBe(null);
        });
    });

    describe('mask request and response', () => {
        const value = {
            'expected': null
        };
        const tracer = Trace(new TraceConfig({
            maskRequest: (request) => {
                value.expected = request;
                return value;
            },

            maskResponse: (response) => {
                value.expected = response;
                return value;
            }
        }));
        const beforeInvocationData = createMockBeforeInvocationData();
        const afterInvocationData = {
            response: { key: 'data' }
        };

        beforeAll(() => {
            tracer.setPluginContext(pluginContext);
            tracer.report = jest.fn();
            tracer.beforeInvocation(beforeInvocationData);
            tracer.afterInvocation(afterInvocationData);
        });


        it('should not add request and response to traceData', () => {
            expect(tracer.rootSpan.tags['aws.lambda.invocation.request']).toEqual({ 'expected': { 'key': 'data' } });
            expect(tracer.rootSpan.tags['aws.lambda.invocation.response']).toEqual({ 'expected': { 'key': 'data' } });
        });
    });

    describe('before invocation', () => {
        const tracer = Trace(new TraceConfig());
        const beforeInvocationData = createMockBeforeInvocationData();

        beforeAll(() => {
            tracer.setPluginContext(pluginContext);
            tracer.beforeInvocation(beforeInvocationData);
        });

        it('should set startTimestamp', () => {
            expect(tracer.startTimestamp).toBeTruthy();
        });

        it('should set apiKey', () => {
            expect(tracer.apiKey).toBe(pluginContext.apiKey);
        });

        it('should set reporter', () => {
            expect(tracer.reporter).toBe(beforeInvocationData.reporter);
        });
    });

    describe('before invocation with SQS event', () => {
        const tracer = Trace(new TraceConfig());
        const pluginContext = createMockPluginContext();
        const beforeInvocationData = createMockBeforeInvocationData();
        
        beforeAll(() => {
            tracer.setPluginContext(pluginContext);
            beforeInvocationData.originalEvent = createMockSQSEvent();
            tracer.beforeInvocation(beforeInvocationData);
        });

        it('should set propagated ids in plugin context', () => {
            expect(pluginContext.transactionId).toBeTruthy();
            expect(pluginContext.traceId).toBe('traceId');
            expect(pluginContext.spanId).toBeTruthy();
        });
    });

    describe('before invocation with batch SQS event from multiple triggers', () => {
        const tracer = Trace(new TraceConfig());
        const pluginContext = createMockPluginContext();
        const beforeInvocationData = createMockBeforeInvocationData();

        beforeAll(() => {
            tracer.setPluginContext(pluginContext);
            beforeInvocationData.originalEvent = createBatchMockSQSEventDifferentIds();
            tracer.beforeInvocation(beforeInvocationData);
        });

        it('should set propagated ids in plugin context', () => {
            expect(pluginContext.transactionId).toBeTruthy();
            expect(pluginContext.traceId).not.toBe('traceId');
            expect(pluginContext.spanId).not.toBe('spanId');
        });
    });

    describe('before invocation with batch SQS event from same trigger', () => {
        const tracer = Trace(new TraceConfig());
        const pluginContext = createMockPluginContext();
        const beforeInvocationData = createMockBeforeInvocationData();

        beforeAll(() => {
            tracer.setPluginContext(pluginContext);
            beforeInvocationData.originalEvent = createBatchMockSQSEventSameIds();
            tracer.beforeInvocation(beforeInvocationData);
        });

        it('should set propagated ids in plugin context', () => {
            expect(pluginContext.transactionId).toBeTruthy();
            expect(pluginContext.traceId).toBe('traceId');
            expect(pluginContext.spanId).toBeTruthy();
        });
    });

    describe('before invocation with SNS event', () => {
        const tracer = Trace(new TraceConfig());
        const pluginContext = createMockPluginContext();
        const beforeInvocationData = createMockBeforeInvocationData();

        beforeAll(() => {
            tracer.setPluginContext(pluginContext);
            beforeInvocationData.originalEvent = createMockSNSEvent();
            tracer.beforeInvocation(beforeInvocationData);
        });

        it('should set propagated ids in plugin context', () => {
            expect(pluginContext.transactionId).toBeTruthy();
            expect(pluginContext.traceId).toBe('traceId');
            expect(pluginContext.spanId).toBeTruthy();
        });
    });


    describe('before invocation with batch SNS event from multiple triggers', () => {
        const tracer = Trace(new TraceConfig());
        const pluginContext = createMockPluginContext();
        const beforeInvocationData = createMockBeforeInvocationData();
        
        beforeAll(() => {
            tracer.setPluginContext(pluginContext);
            beforeInvocationData.originalEvent = createBatchMockSNSEventWithDifferentIds();
            tracer.beforeInvocation(beforeInvocationData);
        });

        it('should set propagated ids in plugin context', () => {
            expect(pluginContext.transactionId).not.toBe('transactionId');
            expect(pluginContext.traceId).not.toBe('traceId');
            expect(pluginContext.spanId).not.toBe('spanId');
        });
    });

    describe('before invocation with batch SNS event from same trigger', () => {
        const tracer = Trace(new TraceConfig());
        const pluginContext = createMockPluginContext();
        const beforeInvocationData = createMockBeforeInvocationData();
        
        beforeAll(() => {
            tracer.setPluginContext(pluginContext);
            beforeInvocationData.originalEvent = createBatchMockSNSEventWithSameIds();
            tracer.beforeInvocation(beforeInvocationData);
        });

        it('should set propagated ids in plugin context', () => {
            expect(pluginContext.transactionId).toBeTruthy();
            expect(pluginContext.traceId).toBe('traceId');
            expect(pluginContext.spanId).toBeTruthy();
        });
    });

    describe('before invocation with ApiGateway event', () => {
        const tracer = Trace(new TraceConfig());
        const pluginContext = createMockPluginContext();
        const beforeInvocationData = createMockBeforeInvocationData();

        beforeAll(() => {
            tracer.setPluginContext(pluginContext);
            beforeInvocationData.originalEvent = createMockApiGatewayProxy();
            tracer.beforeInvocation(beforeInvocationData);
        });

        it('should set propagated ids in plugin context', () => {
            expect(pluginContext.transactionId).toBeTruthy();
            expect(pluginContext.traceId).toBe('traceId');
            expect(pluginContext.spanId).toBeTruthy();
        });
    });

    describe('before invocation with Lambda trigger', () => {
        const tracer = Trace(new TraceConfig());
        const pluginContext = createMockPluginContext();
        const beforeInvocationData = createMockBeforeInvocationData();

        beforeAll(() => {
            tracer.setPluginContext(pluginContext);
            beforeInvocationData.originalContext.clientContext = createMockClientContext();
            tracer.beforeInvocation(beforeInvocationData);
        });

        it('should set propagated ids in plugin context', () => {
            expect(pluginContext.transactionId).toBeTruthy();
            expect(pluginContext.traceId).toBe('traceId');
            expect(pluginContext.spanId).toBeTruthy();
        });
    });

    describe('before invocation with Kinesis event ', () => {
        const tracer = Trace(new TraceConfig());
        const pluginContext = createMockPluginContext();
        const beforeInvocationData = createMockBeforeInvocationData();

        beforeAll(() => {
            InvocationSupport.removeAgentTags();
            InvocationTraceSupport.clear();

            tracer.setPluginContext(pluginContext);
            beforeInvocationData.originalEvent = mockAWSEvents.createMockKinesisEvent();
            tracer.beforeInvocation(beforeInvocationData);
        });

        it('should set trigger tags for Kinesis to root span', () => {
            expect(tracer.rootSpan.tags['trigger.domainName']).toBe('Stream');
            expect(tracer.rootSpan.tags['trigger.className']).toBe('AWS-Kinesis');
            expect(tracer.rootSpan.tags['trigger.operationNames']).toEqual([ 'example_stream' ]);
        });
        
        it('should create incoming kinesis trace links', () => {
            const expTraceLinks = ['eu-west-2:example_stream:shardId-000000000000:49545115243490985018280067714973144582180062593244200961'];
            expect(InvocationTraceSupport.getIncomingTraceLinks()).toEqual(expTraceLinks);
        });
    });

    describe('before invocation with Firehose event ', () => {
        const tracer = Trace(new TraceConfig());
        const pluginContext = createMockPluginContext();
        const beforeInvocationData = createMockBeforeInvocationData();

        beforeAll(() => {
            InvocationSupport.removeAgentTags();
            InvocationTraceSupport.clear();

            tracer.setPluginContext(pluginContext);
            beforeInvocationData.originalEvent = mockAWSEvents.createMockFirehoseEvent();
            tracer.beforeInvocation(beforeInvocationData);
        });

        it('should set trigger tags for FireHose to root span', () => {
            expect(tracer.rootSpan.tags['trigger.domainName']).toBe('Stream');
            expect(tracer.rootSpan.tags['trigger.className']).toBe('AWS-Firehose');
            expect(tracer.rootSpan.tags['trigger.operationNames']).toEqual([ 'exampleStream' ]);
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
        const tracer = Trace(new TraceConfig());
        const pluginContext = createMockPluginContext();
        const beforeInvocationData = createMockBeforeInvocationData();

        beforeAll(() => {
            InvocationSupport.removeAgentTags();
            InvocationTraceSupport.clear();

            tracer.setPluginContext(pluginContext);
            beforeInvocationData.originalEvent = mockAWSEvents.createMockDynamoDBEvent();
            tracer.beforeInvocation(beforeInvocationData);
        });

        it('should set trigger tags for DynamoDB to root span', () => {
            expect(InvocationSupport.getAgentTag('trigger.domainName')).toBe('DB');
            expect(InvocationSupport.getAgentTag('trigger.className')).toBe('AWS-DynamoDB');
            expect(InvocationSupport.getAgentTag('trigger.operationNames')).toEqual([ 'ExampleTableWithStream' ]);
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
                    `${region}:${tableName}:${timestamp+i}:DELETE:${keyHash}`,
                    `${region}:${tableName}:${timestamp+i}:SAVE:${keyHash}`,
                    `${region}:${tableName}:${timestamp+i}:SAVE:${newItemHash}`,
                    `${region}:${tableName}:${timestamp+i}:SAVE:${updatedItemHash}`,
                ];
            }));
            expect(InvocationTraceSupport.getIncomingTraceLinks().sort()).toEqual(expTraceLinks.sort());
        });
    });

    describe('before invocation with SNS event ', () => {
        const tracer = Trace(new TraceConfig());
        const pluginContext = createMockPluginContext();
        const beforeInvocationData = createMockBeforeInvocationData();

        beforeAll(() => {
            InvocationSupport.removeAgentTags();
            InvocationTraceSupport.clear();

            tracer.setPluginContext(pluginContext);
            beforeInvocationData.originalEvent = mockAWSEvents.createMockSNSEvent();
            tracer.beforeInvocation(beforeInvocationData);
        });

        it('should set trigger tags for SNS to root span', () => {
            expect(tracer.rootSpan.tags['trigger.domainName']).toBe('Messaging');
            expect(tracer.rootSpan.tags['trigger.className']).toBe('AWS-SNS');
            expect(tracer.rootSpan.tags['trigger.operationNames']).toEqual([ 'ExampleTopic' ]);
        });

        it('should create incoming sns trace links', () => {
            const expTraceLinks = ['95df01b4-ee98-5cb9-9903-4c221d41eb5e'];
            expect(InvocationTraceSupport.getIncomingTraceLinks()).toEqual(expTraceLinks);
        });
    });

    describe('before invocation with SQS event ', () => {
        const tracer = Trace(new TraceConfig());
        const pluginContext = createMockPluginContext();
        const beforeInvocationData = createMockBeforeInvocationData();

        beforeAll(() => {
            InvocationSupport.removeAgentTags();
            InvocationTraceSupport.clear();

            tracer.setPluginContext(pluginContext);
            beforeInvocationData.originalEvent = mockAWSEvents.createMockSQSEvent();
            tracer.beforeInvocation(beforeInvocationData);
        });

        it('should set trigger tags for SNS to root span', () => {
            expect(tracer.rootSpan.tags['trigger.domainName']).toBe('Messaging');
            expect(tracer.rootSpan.tags['trigger.className']).toBe('AWS-SQS');
            expect(tracer.rootSpan.tags['trigger.operationNames']).toEqual([ 'MyQueue' ]);
        });

        it('should create incoming sqs trace links', () => {
            const expTraceLinks = ['19dd0b57-b21e-4ac1-bd88-01bbb068cb78'];
            expect(InvocationTraceSupport.getIncomingTraceLinks()).toEqual(expTraceLinks);
        });
    });

    describe('before invocation with S3 event ', () => {
        const tracer = Trace(new TraceConfig());
        const pluginContext = createMockPluginContext();
        const beforeInvocationData = createMockBeforeInvocationData();

        beforeAll(() => {
            InvocationSupport.removeAgentTags();
            InvocationTraceSupport.clear();

            tracer.setPluginContext(pluginContext);
            beforeInvocationData.originalEvent = mockAWSEvents.createMockS3Event();
            tracer.beforeInvocation(beforeInvocationData);
        });

        it('should set trigger tags for S3 to root span', () => {
            expect(tracer.rootSpan.tags['trigger.domainName']).toBe('Storage');
            expect(tracer.rootSpan.tags['trigger.className']).toBe('AWS-S3');
            expect(tracer.rootSpan.tags['trigger.operationNames']).toEqual([ 'example-bucket' ]);
            
        });

        it('should create incoming s3 trace links', () => {
            const expTraceLinks = ['EXAMPLE123456789'];
            expect(InvocationTraceSupport.getIncomingTraceLinks()).toEqual(expTraceLinks);
        });
    });

    describe('before invocation with CloudWatchSchedule event ', () => {
        const tracer = Trace(new TraceConfig());
        const pluginContext = createMockPluginContext();
        const beforeInvocationData = createMockBeforeInvocationData();

        beforeAll(() => {
            InvocationSupport.removeAgentTags();
            InvocationTraceSupport.clear();

            tracer.setPluginContext(pluginContext);
            beforeInvocationData.originalEvent = mockAWSEvents.createMockCloudWatchScheduledEvent();
            tracer.beforeInvocation(beforeInvocationData);
        });

        it('should set trigger tags for CloudWatchSchedule to root span', () => {
            expect(tracer.rootSpan.tags['trigger.domainName']).toBe('Schedule');
            expect(tracer.rootSpan.tags['trigger.className']).toBe('AWS-CloudWatch-Schedule');
            expect(tracer.rootSpan.tags['trigger.operationNames']).toEqual([ 'ExampleRule' ]);
        });
    });

    describe('before invocation with CloudWatchLog event ', () => {
        const tracer = Trace(new TraceConfig());
        const pluginContext = createMockPluginContext();
        const beforeInvocationData = createMockBeforeInvocationData();

        beforeAll(() => {
            InvocationSupport.removeAgentTags();
            InvocationTraceSupport.clear();

            tracer.setPluginContext(pluginContext);
            beforeInvocationData.originalEvent = mockAWSEvents.createMockCloudWatchLogEvent();
            tracer.beforeInvocation(beforeInvocationData);
        });

        it('should set trigger tags for CloudWatchLog to root span', () => {
            expect(tracer.rootSpan.tags['trigger.domainName']).toBe('Log');
            expect(tracer.rootSpan.tags['trigger.className']).toBe('AWS-CloudWatch-Log');
            expect(tracer.rootSpan.tags['trigger.operationNames']).toEqual([ 'testLogGroup' ]);
        });
    });

    describe('before invocation with CloudFront event ', () => {
        const tracer = Trace(new TraceConfig());
        const pluginContext = createMockPluginContext();
        const beforeInvocationData = createMockBeforeInvocationData();

        beforeAll(() => {
            InvocationSupport.removeAgentTags();
            InvocationTraceSupport.clear();

            tracer.setPluginContext(pluginContext);
            beforeInvocationData.originalEvent = mockAWSEvents.createMockCloudFrontEvent();
            tracer.beforeInvocation(beforeInvocationData);
        });

        it('should set trigger tags for CloudFront to root span', () => {
            expect(tracer.rootSpan.tags['trigger.domainName']).toBe('CDN');
            expect(tracer.rootSpan.tags['trigger.className']).toBe('AWS-CloudFront');
            expect(tracer.rootSpan.tags['trigger.operationNames']).toEqual([ '/test' ]);
        });
    });

    describe('before invocation with APIGatewayProxy event ', () => {
        const tracer = Trace(new TraceConfig());
        const pluginContext = createMockPluginContext();
        const beforeInvocationData = createMockBeforeInvocationData();

        beforeAll(() => {
            InvocationSupport.removeAgentTags();
            InvocationTraceSupport.clear();

            tracer.setPluginContext(pluginContext);
            beforeInvocationData.originalEvent = mockAWSEvents.createMockAPIGatewayProxyEvent();
            tracer.beforeInvocation(beforeInvocationData);
        });

        it('should set trigger tags for APIGatewayProxy to root span', () => {
            expect(tracer.rootSpan.tags['trigger.domainName']).toBe('API');
            expect(tracer.rootSpan.tags['trigger.className']).toBe('AWS-APIGateway');
            expect(tracer.rootSpan.tags['trigger.operationNames']).toEqual([ '/{proxy+}' ]);
        });

        it('should create incoming apigateway trace links', () => {
            const expTraceLinks = ['spanId'];
            expect(InvocationTraceSupport.getIncomingTraceLinks()).toEqual(expTraceLinks);
        });
    });

    describe('before invocation with APIGatewayPassThrough event ', () => {
        const tracer = Trace(new TraceConfig());
        const pluginContext = createMockPluginContext();
        const beforeInvocationData = createMockBeforeInvocationData();

        beforeAll(() => {
            InvocationSupport.removeAgentTags();
            InvocationTraceSupport.clear();

            tracer.setPluginContext(pluginContext);
            beforeInvocationData.originalEvent = mockAWSEvents.createMockAPIGatewayPassThroughRequest();
            tracer.beforeInvocation(beforeInvocationData);
        });

        it('should set trigger tags for APIGatewayProxy to root span', () => {
            expect(tracer.rootSpan.tags['trigger.domainName']).toBe('API');
            expect(tracer.rootSpan.tags['trigger.className']).toBe('AWS-APIGateway');
            expect(tracer.rootSpan.tags['trigger.operationNames']).toEqual([ 'random.execute-api.us-west-2.amazonaws.com/dev/hello' ]);
        });
    });


    describe('before invocation with Lambda event', () => {
        const tracer = Trace(new TraceConfig());
        const pluginContext = createMockPluginContext();
        const beforeInvocationData = createMockBeforeInvocationData();
        
        beforeAll(() => {
            InvocationSupport.removeAgentTags();
            InvocationTraceSupport.clear();

            tracer.setPluginContext(pluginContext);
            beforeInvocationData.originalContext.clientContext = createMockClientContext();
            tracer.beforeInvocation(beforeInvocationData);
        });

        it('should set trigger tags for Lambda to root span', () => {
            expect(tracer.rootSpan.tags['trigger.domainName']).toBe('API');
            expect(tracer.rootSpan.tags['trigger.className']).toBe('AWS-Lambda');
            expect(tracer.rootSpan.tags['trigger.operationNames']).toEqual([ 'lambda-function' ]);
        });

        it('should create incoming lambda trace links', () => {
            const expTraceLinks = ['awsRequestId'];
            expect(InvocationTraceSupport.getIncomingTraceLinks()).toEqual(expTraceLinks);
        });
    });

    describe('after invocation without error data', () => {
        const tracer = Trace(new TraceConfig());
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

        const rootSpanData = tracer.buildSpanData(tracer.rootSpan, tracer.pluginContext);

        it('should call report', () => {
            expect(tracer.report).toBeCalledWith({
                data: rootSpanData,
                type: 'Span',
                apiKey: tracer.apiKey,
                dataModelVersion: DATA_MODEL_VERSION
            });
        });
 
    });
 
    describe('after invocation with error data', () => {
        const tracer = Trace(new TraceConfig());
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
 
        it('should set rootSpan', () => {
            expect(tracer.rootSpan.tags['aws.lambda.invocation.response']).toEqual({
                errorMessage: 'error message',
                errorType: 'Error',
                code: 0,
                stack: testError.stack
            });
        }); 
    });

});
