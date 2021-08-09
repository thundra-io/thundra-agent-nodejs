import {LambdaContextProvider} from '../../dist/wrappers/lambda/LambdaContextProvider';
import ExecutionContext from '../../dist/context/ExecutionContext';
import ThundraTracer from '../../dist/opentracing/Tracer';
import {expressMW} from '../../dist/wrappers/express/ExpressWrapper';

const express = require('express');

const createMockContext = () => {
    return {
        callbackWaitsForEmptyEventLoop: true,
        done: jest.fn(),
        succeed: jest.fn(),
        fail: jest.fn(),
        logGroupName: '/aws/lambda/test',
        logStreamName: '2018/03/07/[$LATEST]test',
        functionName: 'test',
        memoryLimitInMB: 512,
        functionVersion: '$LATEST',
        getRemainingTimeInMillis: jest.fn(),
        invokeid: 'invokeId',
        awsRequestId: 'awsRequestId',
        invokedFunctionArn: 'arn:aws:lambda:us-west-2:123456789123:function:test'
    };
};

const createMockReporterInstance = () => {
    return {
        addReport: jest.fn(),
        sendReports: jest.fn(),
        httpsRequest: jest.fn()
    };
};

const createMockWrapperInstance = () => {
    return {
        apiKey: 'apiKey',
        originalContext: createMockContext(),
        originalEvent: {key: 'data'},
        coldStart: 'false',
        reporter: createMockReporterInstance(),
        pluginContext: createMockPluginContext()
    };
};

const createMockPlugin = () => {
    return {
        hooks: {'not-a-real-hook': jest.fn()}
    };
};

const createMockPluginContext = () => {
    return {
        applicationInfo: {
            applicationId: 'applicationId',
            applicationProfile: 'default',
            applicationRegion: 'region',
            applicationVersion: 'version',
        },
        requestCount: 0,
        apiKey: 'apiKey',
        maxMemory: 512,
        invocationStartTimestamp: Date.now(),
        invocationFinishTimestamp: Date.now(),
        resetTimestamps: () => undefined,
    };
};

const createMockLambdaExecContext = () => {
    return new ExecutionContext({
        tracer: new ThundraTracer(),
        transactionId: 'foo',
        platformData: {
            originalContext: createMockContext(),
            originalEvent: {key: 'data'},
        },
        response: {key: 'data'},
    });
}

const createMockBeforeInvocationData = () => {
    const mockWrapperInstance = createMockWrapperInstance();
    LambdaContextProvider.setContext(mockWrapperInstance.originalContext);
    return {
        originalContext: mockWrapperInstance.originalContext,
        originalEvent: mockWrapperInstance.originalEvent,
        reporter: mockWrapperInstance.reporter,
        contextId: 'contextId',
        transactionId: 'transactionId',
    };
};

const createMockPromise = () => {
    return Promise.resolve('test');
};

const createMockLogManager = () => {
    return {
        reportLog: jest.fn()
    };
};

const createMockListener = () => {
    return {
        reportLog: jest.fn()
    };
};

const createMockReporter = () => {
    return {
        addReport: jest.fn()
    };
};

const createMockSQSEvent = () => {
    return {
        Records: [
            {
                messageId: '19dd0b57-b21e-4ac1-bd88-01bbb068cb78',
                receiptHandle: 'MessageReceiptHandle',
                body: 'Hello from SQS!',
                attributes: {
                    ApproximateReceiveCount: '1',
                    SentTimestamp: '1523232000000',
                    SenderId: '123456789012',
                    ApproximateFirstReceiveTimestamp: '1523232000001'
                },
                messageAttributes: {
                    'x-thundra-span-id': {
                        stringValue: 'spanId',
                        stringListValues: [],
                        binaryListValues: [],
                        dataType: 'String'
                    },
                    'x-thundra-transaction-id': {
                        stringValue: 'transactionId',
                        stringListValues: [],
                        binaryListValues: [],
                        dataType: 'String'
                    },
                    'x-thundra-trace-id': {
                        stringValue: 'traceId',
                        stringListValues: [],
                        binaryListValues: [],
                        dataType: 'String'
                    }
                },
                md5OfBody: '7b270e59b47ff90a553787216d55d91d',
                eventSource: 'aws:sqs',
                eventSourceARN: 'arn:aws:sqs:us-west-2:123456789012:MyQueue',
                awsRegion: 'us-west-2'
            }
        ]
    };
};

const createBatchMockSQSEventDifferentIds = () => {
    return {
        Records: [
            {
                messageId: '19dd0b57-b21e-4ac1-bd88-01bbb068cb78',
                receiptHandle: 'MessageReceiptHandle',
                body: 'Hello from SQS!',
                attributes: {
                    ApproximateReceiveCount: '1',
                    SentTimestamp: '1523232000000',
                    SenderId: '123456789012',
                    ApproximateFirstReceiveTimestamp: '1523232000001'
                },
                messageAttributes: {
                    'x-thundra-span-id': {
                        stringValue: 'spanId',
                        stringListValues: [],
                        binaryListValues: [],
                        dataType: 'String'
                    },
                    'x-thundra-transaction-id': {
                        stringValue: 'transactionId',
                        stringListValues: [],
                        binaryListValues: [],
                        dataType: 'String'
                    },
                    'x-thundra-trace-id': {
                        stringValue: 'traceId',
                        stringListValues: [],
                        binaryListValues: [],
                        dataType: 'String'
                    }
                },
                md5OfBody: '7b270e59b47ff90a553787216d55d91d',
                eventSource: 'aws:sqs',
                eventSourceARN: 'arn:aws:sqs:us-west-2:123456789012:MyQueue',
                awsRegion: 'us-west-2'
            },
            {
                messageId: '19dd0b57-b21e-4ac1-bd88-01bbb068cb78',
                receiptHandle: 'MessageReceiptHandle',
                body: 'Hello from SQS!',
                attributes: {
                    ApproximateReceiveCount: '1',
                    SentTimestamp: '1523232000000',
                    SenderId: '123456789012',
                    ApproximateFirstReceiveTimestamp: '1523232000001'
                },
                messageAttributes: {
                    'x-thundra-span-id': {
                        stringValue: 'differentSpanId',
                        stringListValues: [],
                        binaryListValues: [],
                        dataType: 'String'
                    },
                    'x-thundra-transaction-id': {
                        stringValue: 'differentTransactionId2',
                        stringListValues: [],
                        binaryListValues: [],
                        dataType: 'String'
                    },
                    'x-thundra-trace-id': {
                        stringValue: 'differentTraceId',
                        stringListValues: [],
                        binaryListValues: [],
                        dataType: 'String'
                    }
                },
                md5OfBody: '7b270e59b47ff90a553787216d55d91d',
                eventSource: 'aws:sqs',
                eventSourceARN: 'arn:aws:sqs:us-west-2:123456789012:MyQueue',
                awsRegion: 'us-west-2'
            }
        ]
    };
};

const createBatchMockSQSEventSameIds = () => {
    return {
        Records: [
            {
                messageId: '19dd0b57-b21e-4ac1-bd88-01bbb068cb78',
                receiptHandle: 'MessageReceiptHandle',
                body: 'Hello from SQS!',
                attributes: {
                    ApproximateReceiveCount: '1',
                    SentTimestamp: '1523232000000',
                    SenderId: '123456789012',
                    ApproximateFirstReceiveTimestamp: '1523232000001'
                },
                messageAttributes: {
                    'x-thundra-span-id': {
                        stringValue: 'spanId',
                        stringListValues: [],
                        binaryListValues: [],
                        dataType: 'String'
                    },
                    'x-thundra-transaction-id': {
                        stringValue: 'transactionId',
                        stringListValues: [],
                        binaryListValues: [],
                        dataType: 'String'
                    },
                    'x-thundra-trace-id': {
                        stringValue: 'traceId',
                        stringListValues: [],
                        binaryListValues: [],
                        dataType: 'String'
                    }
                },
                md5OfBody: '7b270e59b47ff90a553787216d55d91d',
                eventSource: 'aws:sqs',
                eventSourceARN: 'arn:aws:sqs:us-west-2:123456789012:MyQueue',
                awsRegion: 'us-west-2'
            },
            {
                messageId: '19dd0b57-b21e-4ac1-bd88-01bbb068cb78',
                receiptHandle: 'MessageReceiptHandle',
                body: 'Hello from SQS!',
                attributes: {
                    ApproximateReceiveCount: '1',
                    SentTimestamp: '1523232000000',
                    SenderId: '123456789012',
                    ApproximateFirstReceiveTimestamp: '1523232000001'
                },
                messageAttributes: {
                    'x-thundra-span-id': {
                        stringValue: 'spanId',
                        stringListValues: [],
                        binaryListValues: [],
                        dataType: 'String'
                    },
                    'x-thundra-transaction-id': {
                        stringValue: 'transactionId',
                        stringListValues: [],
                        binaryListValues: [],
                        dataType: 'String'
                    },
                    'x-thundra-trace-id': {
                        stringValue: 'traceId',
                        stringListValues: [],
                        binaryListValues: [],
                        dataType: 'String'
                    }
                },
                md5OfBody: '7b270e59b47ff90a553787216d55d91d',
                eventSource: 'aws:sqs',
                eventSourceARN: 'arn:aws:sqs:us-west-2:123456789012:MyQueue',
                awsRegion: 'us-west-2'
            }
        ]
    };
};

const createMockSNSEvent = () => {
    return {
        Records: [
            {
                EventSource: 'aws:sns',
                EventVersion: '1.0',
                EventSubscriptionArn: 'arn:aws:sns:us-west-2:{{accountId}}:ExampleTopic',
                Sns: {
                    Type: 'Notification',
                    MessageId: '95df01b4-ee98-5cb9-9903-4c221d41eb5e',
                    TopicArn: 'arn:aws:sns:us-west-2:123456789012:ExampleTopic',
                    Subject: 'example subject',
                    Message: 'example message',
                    Timestamp: '1970-01-01T00:00:00.000Z',
                    SignatureVersion: '1',
                    Signature: 'EXAMPLE',
                    SigningCertUrl: 'EXAMPLE',
                    UnsubscribeUrl: 'EXAMPLE',
                    MessageAttributes: {
                        'x-thundra-trace-id': {
                            Type: 'String',
                            Value: 'traceId'
                        },
                        'x-thundra-transaction-id': {
                            Type: 'String',
                            Value: 'transactionId'
                        },
                        'x-thundra-span-id': {
                            Type: 'String',
                            Value: 'spanId'
                        }
                    }
                }
            }
        ]
    };
};

const createBatchMockSNSEventWithDifferentIds = () => {
    return {
        Records: [
            {
                EventSource: 'aws:sns',
                EventVersion: '1.0',
                EventSubscriptionArn: 'arn:aws:sns:us-west-2:{{accountId}}:ExampleTopic',
                Sns: {
                    Type: 'Notification',
                    MessageId: '95df01b4-ee98-5cb9-9903-4c221d41eb5e',
                    TopicArn: 'arn:aws:sns:us-west-2:123456789012:ExampleTopic',
                    Subject: 'example subject',
                    Message: 'example message',
                    Timestamp: '1970-01-01T00:00:00.000Z',
                    SignatureVersion: '1',
                    Signature: 'EXAMPLE',
                    SigningCertUrl: 'EXAMPLE',
                    UnsubscribeUrl: 'EXAMPLE',
                    MessageAttributes: {
                        'x-thundra-trace-id': {
                            Type: 'String',
                            Value: 'differentTraceId'
                        },
                        'x-thundra-transaction-id': {
                            Type: 'String',
                            Value: 'differentTransactionId'
                        },
                        'x-thundra-span-id': {
                            Type: 'String',
                            Value: 'differentSpanId'
                        }
                    }
                }
            },
            {
                EventSource: 'aws:sns',
                EventVersion: '1.0',
                EventSubscriptionArn: 'arn:aws:sns:us-west-2:{{accountId}}:ExampleTopic',
                Sns: {
                    Type: 'Notification',
                    MessageId: '95df01b4-ee98-5cb9-9903-4c221d41eb5e',
                    TopicArn: 'arn:aws:sns:us-west-2:123456789012:ExampleTopic',
                    Subject: 'example subject',
                    Message: 'example message',
                    Timestamp: '1970-01-01T00:00:00.000Z',
                    SignatureVersion: '1',
                    Signature: 'EXAMPLE',
                    SigningCertUrl: 'EXAMPLE',
                    UnsubscribeUrl: 'EXAMPLE',
                    MessageAttributes: {
                        'x-thundra-trace-id': {
                            Type: 'String',
                            Value: 'traceId'
                        },
                        'x-thundra-transaction-id': {
                            Type: 'String',
                            Value: 'transactionId'
                        },
                        'x-thundra-span-id': {
                            Type: 'String',
                            Value: 'spanId'
                        }
                    }
                }
            }
        ]
    };
};

const createBatchMockSNSEventWithSameIds = () => {
    return {
        Records: [
            {
                EventSource: 'aws:sns',
                EventVersion: '1.0',
                EventSubscriptionArn: 'arn:aws:sns:us-west-2:{{accountId}}:ExampleTopic',
                Sns: {
                    Type: 'Notification',
                    MessageId: '95df01b4-ee98-5cb9-9903-4c221d41eb5e',
                    TopicArn: 'arn:aws:sns:us-west-2:123456789012:ExampleTopic',
                    Subject: 'example subject',
                    Message: 'example message',
                    Timestamp: '1970-01-01T00:00:00.000Z',
                    SignatureVersion: '1',
                    Signature: 'EXAMPLE',
                    SigningCertUrl: 'EXAMPLE',
                    UnsubscribeUrl: 'EXAMPLE',
                    MessageAttributes: {
                        'x-thundra-trace-id': {
                            Type: 'String',
                            Value: 'traceId'
                        },
                        'x-thundra-transaction-id': {
                            Type: 'String',
                            Value: 'transactionId'
                        },
                        'x-thundra-span-id': {
                            Type: 'String',
                            Value: 'spanId'
                        }
                    }
                }
            },
            {
                EventSource: 'aws:sns',
                EventVersion: '1.0',
                EventSubscriptionArn: 'arn:aws:sns:us-west-2:{{accountId}}:ExampleTopic',
                Sns: {
                    Type: 'Notification',
                    MessageId: '95df01b4-ee98-5cb9-9903-4c221d41eb5e',
                    TopicArn: 'arn:aws:sns:us-west-2:123456789012:ExampleTopic',
                    Subject: 'example subject',
                    Message: 'example message',
                    Timestamp: '1970-01-01T00:00:00.000Z',
                    SignatureVersion: '1',
                    Signature: 'EXAMPLE',
                    SigningCertUrl: 'EXAMPLE',
                    UnsubscribeUrl: 'EXAMPLE',
                    MessageAttributes: {
                        'x-thundra-trace-id': {
                            Type: 'String',
                            Value: 'traceId'
                        },
                        'x-thundra-transaction-id': {
                            Type: 'String',
                            Value: 'transactionId'
                        },
                        'x-thundra-span-id': {
                            Type: 'String',
                            Value: 'spanId'
                        }
                    }
                }
            }
        ]
    };
};

const createMockApiGatewayProxy = () => {
    return {
        headers: {
            'x-thundra-trace-id': 'traceId',
            'x-thundra-transaction-id': 'transactionId',
            'x-thundra-span-id': 'spanId',
        },
        resource: '/',
        path: '/',
        requestContext: {
            path: '/prod/path/to/resource',
            resourcePath: '/{proxy+}',
            httpMethod: 'POST',
            apiId: '1234567890',
            protocol: 'HTTP/1.1'
        }
    };
};

const createMockClientContext = () => {
    return {
        custom: {
            'x-thundra-trace-id': 'traceId',
            'x-thundra-transaction-id': 'transactionId',
            'x-thundra-span-id': 'spanId',
            'x-thundra-lambda-trigger-operation-name': 'lambda-function',
        }
    };
};

const createMockExpressApp = async () => {
    const app = express();

    app.use(expressMW({
        disableAsyncContextManager: true,
        reporter: createMockReporterInstance(),
    }));

    app.get('/', function (req, res) {
        res.send('Hello Thundra!');
    });

    app.get('/error', function (req, res, next) {
        next(new APIError('Boom'));
    });

    let resolve;
    const serverInitPromise = new Promise((r => resolve = r));
    const server = app.listen(() => {
        resolve();
    });
    app.server = server;
    await serverInitPromise;


    return app;
};

class APIError extends Error {
    constructor(message) {
        super(message);
        this.name = APIError.name;
        Error.captureStackTrace(this, APIError);
    }
}

module.exports = {
    APIError,
    createMockContext,
    createMockExpressApp,
    createMockReporterInstance,
    createMockWrapperInstance,
    createMockPluginContext,
    createMockPlugin,
    createMockBeforeInvocationData,
    createMockPromise,
    createMockLogManager,
    createMockListener,
    createMockReporter,
    createMockSQSEvent,
    createMockSNSEvent,
    createMockApiGatewayProxy,
    createMockClientContext,
    createBatchMockSQSEventDifferentIds,
    createBatchMockSQSEventSameIds,
    createBatchMockSNSEventWithDifferentIds,
    createBatchMockSNSEventWithSameIds,
    createMockLambdaExecContext
};
