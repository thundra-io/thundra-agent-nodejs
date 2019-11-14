const thundra = require('../dist/index');
import Utils from '../dist/plugins/utils/Utils';
import { createMockContext } from './mocks/mocks';
import { envVariableKeys, SecurityTags } from '../dist/Constants';
import AWSCalls from './integration/utils/aws.integration.utils';
import ThundraWrapper from '../dist/ThundraWrapper';
import Recorder from '../dist/opentracing/Recorder';
import AWSIntegration from '../dist/plugins/integrations/AWSIntegration';


const clearRecorder = (recorder) => {
    recorder.activeSpanStack.clear();
    recorder.spanList = [];
    recorder.spanOrder = 1;
}

beforeAll(() => {
    Utils.readProcIoPromise = jest.fn(() => {
        return new Promise((resolve, reject) => {
            return resolve({ readBytes: 1024, writeBytes: 4096 });
        });
    });
    
    Utils.readProcMetricPromise = jest.fn(() => {
        return new Promise((resolve, reject) => {
            return resolve({ threadCount: 10 });
        });
    });

    
    // Mock reporting and destroying methods
    AWSIntegration.prototype.getOriginalFuntion = jest.fn(() => {
        return (cb) => {
            cb(Error('foo error'), null);
        }
    });
    ThundraWrapper.prototype.executeAfteInvocationAndReport = jest.fn();
    Recorder.prototype.destroy = jest.fn();
});

describe('whitelist config', () => {
    const config = {
        type: "SecurityAwareSpanListener",
        config: {
            block: false,
            whitelist: [
                {
                    className: "AWS-DynamoDB",
                    tags: {
                        "aws.dynamodb.table.name": [
                            "test-table"
                        ],
                        "operation.type": [
                            "WRITE"
                        ]
                    }
                },
                {
                    className: "AWS-Lambda",
                    tags: {
                        "aws.lambda.name": [
                            "Test"
                        ],
                        "operation.type": [
                            "WRITE"
                        ]
                    }
                },
                {
                    className: "AWS-SQS",
                    tags: {
                        "aws.sqs.queue.name": [
                            "MyQueue"
                        ],
                        "operation.type": [
                            "WRITE"
                        ]
                    }
                },
                {
                    className: "AWS-S3",
                    tags: {
                        "aws.s3.bucket.name": [
                            "test"
                        ],
                        "operation.type": [
                            "READ"
                        ]
                    }
                },
                {
                    className: "AWS-SNS",
                    tags: {
                        "aws.sns.topic.name": [
                            "TEST_TOPIC"
                        ],
                        "operation.type": [
                            "WRITE"
                        ]
                    }
                },
                {
                    className: "AWS-Kinesis",
                    tags: {
                        "aws.kinesis.stream.name": [
                            "STRING_VALUE"
                        ],
                        "operation.type": [
                            "WRITE"
                        ]
                    }
                },
                {
                    className: "AWS-Firehose",
                    tags: {
                        "aws.firehose.stream.name": [
                            "STRING_VALUE"
                        ],
                        "operation.type": [
                            "WRITE"
                        ]
                    }
                },
                {
                    className: "AWS-Athena",
                    tags: {
                        "db.instance": [
                            "sample-db"
                        ],
                        "operation.type": [
                            "WRITE"
                        ]
                    }
                },
            ]
        }
    };
    const originalEvent = { key: 'value' }
    const originalContext = createMockContext();
    let thundraWrapper;
    let recorder;

    beforeAll(() => {
        process.env[envVariableKeys.THUNDRA_AGENT_LAMBDA_SPAN_LISTENER_DEF] = JSON.stringify(config);
        thundraWrapper = thundra({apiKey: 'apiKey', timeoutMargin: 0});
        recorder = thundra.tracer().recorder;
    });

    afterEach(() => {
        clearRecorder(recorder);
    });

    describe('using aws integration', () => {
        const sdk = require('aws-sdk');
        sdk.config.update({ maxRetries: 0 });

        test('should whitelist dynamodb operation', () => {
            const originalFunction = () => AWSCalls.dynamo(sdk);
            const wrappedFunc = thundraWrapper(originalFunction);

            return wrappedFunc(originalEvent, originalContext).then(() => {
                const span = recorder.spanList[1];

                expect(recorder.spanList.length).toBe(2);
                expect(span.tags[SecurityTags.BLOCKED]).toBeUndefined();
                expect(span.tags[SecurityTags.VIOLATED]).toBeUndefined();
                expect(span.startTime).toBeGreaterThan(0);
                expect(span.finishTime).toBeGreaterThan(0);
            });
        });
        
        test('should whitelist lambda operation', () => {
            const originalFunction = () => AWSCalls.lambda(sdk);
            const wrappedFunc = thundraWrapper(originalFunction);

            return wrappedFunc(originalEvent, originalContext).then(() => {
                const span = recorder.spanList[1];

                expect(recorder.spanList.length).toBe(2);
                expect(span.tags[SecurityTags.BLOCKED]).toBeUndefined();
                expect(span.tags[SecurityTags.VIOLATED]).toBeUndefined();
                expect(span.startTime).toBeGreaterThan(0);
                expect(span.finishTime).toBeGreaterThan(0);
            });
        });
        
        test('should whitelist sqs operation', () => {
            const originalFunction = () => AWSCalls.sqs(sdk);
            const wrappedFunc = thundraWrapper(originalFunction);

            return wrappedFunc(originalEvent, originalContext).then(() => {
                const span = recorder.spanList[1];
                
                expect(recorder.spanList.length).toBe(2);
                expect(span.tags[SecurityTags.BLOCKED]).toBeUndefined();
                expect(span.tags[SecurityTags.VIOLATED]).toBeUndefined();
                expect(span.startTime).toBeGreaterThan(0);
                expect(span.finishTime).toBeGreaterThan(0);
            });
        });
        
        test('should whitelist s3 operation', () => {
            const originalFunction = () => AWSCalls.s3GetObject(sdk);
            const wrappedFunc = thundraWrapper(originalFunction);

            return wrappedFunc(originalEvent, originalContext).then(() => {
                const span = recorder.spanList[1];
                
                expect(recorder.spanList.length).toBe(2);
                expect(span.tags[SecurityTags.BLOCKED]).toBeUndefined();
                expect(span.tags[SecurityTags.VIOLATED]).toBeUndefined();
                expect(span.startTime).toBeGreaterThan(0);
                expect(span.finishTime).toBeGreaterThan(0);
            });
        });
        
        test('should whitelist sns operation', () => {
            const originalFunction = () => AWSCalls.sns_topic(sdk);
            const wrappedFunc = thundraWrapper(originalFunction);

            return wrappedFunc(originalEvent, originalContext).then(() => {
                const span = recorder.spanList[1];
                
                expect(recorder.spanList.length).toBe(2);
                expect(span.tags[SecurityTags.BLOCKED]).toBeUndefined();
                expect(span.tags[SecurityTags.VIOLATED]).toBeUndefined();
                expect(span.startTime).toBeGreaterThan(0);
                expect(span.finishTime).toBeGreaterThan(0);
            });
        });
        
        test('should whitelist kinesis operation', () => {
            const originalFunction = () => AWSCalls.kinesis(sdk);
            const wrappedFunc = thundraWrapper(originalFunction);

            return wrappedFunc(originalEvent, originalContext).then(() => {
                const span = recorder.spanList[1];
                
                expect(recorder.spanList.length).toBe(2);
                expect(span.tags[SecurityTags.BLOCKED]).toBeUndefined();
                expect(span.tags[SecurityTags.VIOLATED]).toBeUndefined();
                expect(span.startTime).toBeGreaterThan(0);
                expect(span.finishTime).toBeGreaterThan(0);
            });
        });
        
        test('should whitelist firehose operation', () => {
            const originalFunction = () => AWSCalls.kinesis(sdk);
            const wrappedFunc = thundraWrapper(originalFunction);

            return wrappedFunc(originalEvent, originalContext).then(() => {
                const span = recorder.spanList[1];
                
                expect(recorder.spanList.length).toBe(2);
                expect(span.tags[SecurityTags.BLOCKED]).toBeUndefined();
                expect(span.tags[SecurityTags.VIOLATED]).toBeUndefined();
                expect(span.startTime).toBeGreaterThan(0);
                expect(span.finishTime).toBeGreaterThan(0);
            });
        });
        
        test('should whitelist athena operation', () => {
            const originalFunction = () => AWSCalls.athenaStartQueryExec(sdk);
            const wrappedFunc = thundraWrapper(originalFunction);

            return wrappedFunc(originalEvent, originalContext).then(() => {
                const span = recorder.spanList[1];

                expect(recorder.spanList.length).toBe(2);
                expect(span.tags[SecurityTags.BLOCKED]).toBeUndefined();
                expect(span.tags[SecurityTags.VIOLATED]).toBeUndefined();
                expect(span.startTime).toBeGreaterThan(0);
                expect(span.finishTime).toBeGreaterThan(0);
            });
        });
    });
});

describe('blacklist config', () => {});