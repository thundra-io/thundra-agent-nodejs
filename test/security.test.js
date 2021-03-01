import ConfigProvider from '../dist/config/ConfigProvider';
import ConfigNames from '../dist/config/ConfigNames';
import Utils from '../dist/utils/Utils';
import { createMockContext } from './mocks/mocks';
import { SecurityTags, ClassNames } from '../dist/Constants';
import AWSCalls from './integrations/utils/aws.integration.utils';
import HTTPCalls from './integrations/utils/http.integration.utils';
import ESCalls from './integrations/utils/es.integration.utils';
import RedisCalls from './integrations/utils/redis.integration.utils';
import MySQLCalls from './integrations/utils/mysql.integration.utils';
import MongoCalls from './integrations/utils/mongodb.integration.utils';
import LambdaHandlerWrapper from '../dist/wrappers/lambda/LambdaHandlerWrapper';
import Recorder from '../dist/opentracing/Recorder';
import { AWSIntegration } from '../dist/integrations/AWSIntegration';
import ExecutionContextManager from '../dist/context/ExecutionContextManager';

import TestUtils from './utils.js';

const thundra = require('../dist/index');

beforeEach(() => {
    TestUtils.clearEnvironmentVariables();
    ConfigProvider.clear();
});

afterEach(() => {
    TestUtils.clearEnvironmentVariables();
    ConfigProvider.clear();
});

const operationList = [
    {
        className: ClassNames.DYNAMODB,
        tags: {
            'aws.dynamodb.table.name': [
                'test-table'
            ],
            'operation.type': [
                'WRITE'
            ]
        }
    },
    {
        className: ClassNames.LAMBDA,
        tags: {
            'aws.lambda.name': [
                'Test'
            ],
            'operation.type': [
                'WRITE'
            ]
        }
    },
    {
        className: ClassNames.SQS,
        tags: {
            'aws.sqs.queue.name': [
                'MyQueue'
            ],
            'operation.type': [
                'WRITE'
            ]
        }
    },
    {
        className: ClassNames.S3,
        tags: {
            'aws.s3.bucket.name': [
                'test'
            ],
            'operation.type': [
                'READ'
            ]
        }
    },
    {
        className: ClassNames.SNS,
        tags: {
            'aws.sns.topic.name': [
                'TEST_TOPIC'
            ],
            'operation.type': [
                'WRITE'
            ]
        }
    },
    {
        className: ClassNames.KINESIS,
        tags: {
            'aws.kinesis.stream.name': [
                'STRING_VALUE'
            ],
            'operation.type': [
                'WRITE'
            ]
        }
    },
    {
        className: ClassNames.FIREHOSE,
        tags: {
            'aws.firehose.stream.name': [
                'STRING_VALUE'
            ],
            'operation.type': [
                'WRITE'
            ]
        }
    },
    {
        className: ClassNames.ATHENA,
        tags: {
            'db.instance': [
                'sample-db'
            ],
            'operation.type': [
                'WRITE'
            ]
        }
    },
    {
        className: ClassNames.HTTP,
        tags: {
            'http.host': [
                'jsonplaceholder.typicode.com',
                'httpstat.us',
                'qbzotxrb9a.execute-api.us-west-2.amazonaws.com',
                '34zsqapxkj.execute-api.eu-west-1.amazonaws.com'
            ],
            'operation.type': [
                'GET'
            ]
        }
    },
    {
        className: ClassNames.ELASTICSEARCH,
        tags: {
            'elasticsearch.normalized_uri': [
                '/twitter'
            ],
            'operation.type': [
                'POST'
            ]
        }
    },
    {
        className: ClassNames.REDIS,
        tags: {
            'redis.host': [
                '127.0.0.1',
                'localhost'
            ],
            'operation.type': [
                'WRITE'
            ]
        }
    },
    {
        className: ClassNames.MYSQL,
        tags: {
            'db.instance': [
                'db'
            ],
            'operation.type': [
                'READ'
            ]
        }
    },
    {
        className: ClassNames.MONGODB,
        tags: {
            'db.instance': [
                'testDB'
            ],
            'operation.type': [
                'DELETE'
            ]
        }
    },
];

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
    AWSIntegration.prototype.getOriginalFunction = jest.fn(() => {
        return (cb) => {
            cb(null, { result: 'OK' });
        };
    });
    LambdaHandlerWrapper.prototype.executeAfterInvocationAndReport = jest.fn();
    Recorder.prototype.destroy = jest.fn();
});

describe('whitelist config', () => {
    const config = {
        type: 'SecurityAwareSpanListener',
        config: {
            block: false,
            whitelist: operationList,
        }
    };

    let thundraWrapper;
    const originalEvent = { key: 'value' };
    const originalContext = createMockContext();

    const checkIfWhitelisted = (span) => {
        expect(span.tags[SecurityTags.BLOCKED]).toBeUndefined();
        expect(span.tags[SecurityTags.VIOLATED]).toBeUndefined();
        expect(span.startTime).toBeGreaterThan(0);
        expect(span.finishTime).toBeGreaterThan(0);
    };

    beforeAll(() => {
        ConfigProvider.set(ConfigNames.THUNDRA_TRACE_SPAN_LISTENERCONFIG, JSON.stringify(config));
        thundraWrapper = thundra({ apiKey: 'apiKey', timeoutMargin: 0 });
    });

    describe('using aws integration', () => {
        const sdk = require('aws-sdk');
        sdk.config.update({ maxRetries: 0 });

        test('should whitelist dynamodb operation', () => {
            const originalFunction = () => AWSCalls.dynamo(sdk);
            const wrappedFunc = thundraWrapper(originalFunction);

            return wrappedFunc(originalEvent, originalContext).then(() => {
                const { tracer } = ExecutionContextManager.get();
                const span = tracer.recorder.spanList[1];
                checkIfWhitelisted(span);
            });
        });

        test('should whitelist lambda operation', () => {
            const originalFunction = () => AWSCalls.lambda(sdk);
            const wrappedFunc = thundraWrapper(originalFunction);

            return wrappedFunc(originalEvent, originalContext).then(() => {
                const { tracer } = ExecutionContextManager.get();
                const span = tracer.recorder.spanList[1];
                checkIfWhitelisted(span);
            });
        });

        test('should whitelist sqs operation', () => {
            const originalFunction = () => AWSCalls.sqs(sdk);
            const wrappedFunc = thundraWrapper(originalFunction);

            return wrappedFunc(originalEvent, originalContext).then(() => {
                const { tracer } = ExecutionContextManager.get();
                const span = tracer.recorder.spanList[1];
                checkIfWhitelisted(span);
            });
        });

        test('should whitelist s3 operation', () => {
            const originalFunction = () => AWSCalls.s3GetObject(sdk);
            const wrappedFunc = thundraWrapper(originalFunction);

            return wrappedFunc(originalEvent, originalContext).then(() => {
                const { tracer } = ExecutionContextManager.get();
                const span = tracer.recorder.spanList[1];
                checkIfWhitelisted(span);
            });
        });

        test('should whitelist sns operation', () => {
            const originalFunction = () => AWSCalls.sns_topic(sdk);
            const wrappedFunc = thundraWrapper(originalFunction);

            return wrappedFunc(originalEvent, originalContext).then(() => {
                const { tracer } = ExecutionContextManager.get();
                const span = tracer.recorder.spanList[1];
                checkIfWhitelisted(span);
            });
        });

        test('should whitelist kinesis operation', () => {
            const originalFunction = () => AWSCalls.kinesis(sdk);
            const wrappedFunc = thundraWrapper(originalFunction);

            return wrappedFunc(originalEvent, originalContext).then(() => {
                const { tracer } = ExecutionContextManager.get();
                const span = tracer.recorder.spanList[1];
                checkIfWhitelisted(span);
            });
        });

        test('should whitelist firehose operation', () => {
            const originalFunction = () => AWSCalls.kinesis(sdk);
            const wrappedFunc = thundraWrapper(originalFunction);

            return wrappedFunc(originalEvent, originalContext).then(() => {
                const { tracer } = ExecutionContextManager.get();
                const span = tracer.recorder.spanList[1];
                checkIfWhitelisted(span);
            });
        });

        test('should whitelist athena operation', () => {
            const originalFunction = () => AWSCalls.athenaStartQueryExec(sdk);
            const wrappedFunc = thundraWrapper(originalFunction);

            return wrappedFunc(originalEvent, originalContext).then(() => {
                const { tracer } = ExecutionContextManager.get();
                const span = tracer.recorder.spanList[1];
                checkIfWhitelisted(span);
            });
        });
    });

    // These tests are failing on Github Action
    // but passing on CircleCI and on local.
    // No idea what's going on.
    describe('using http integration', () => {
        const http = require('http');
        const https = require('https');

        test('should whitelist http get operation', () => {
            const originalFunction = () => HTTPCalls.get(http);
            const wrappedFunc = thundraWrapper(originalFunction);

            return wrappedFunc(originalEvent, originalContext).then(() => {
                const { tracer } = ExecutionContextManager.get();
                console.log('<<< SECURITY TEST HTTP >>>');
                console.log(tracer.recorder.spanList);
                const span = tracer.recorder.spanList[1];
                checkIfWhitelisted(span);
            });
        });

        test('should whitelist api-gateway get operation', () => {
            const originalFunction = () => HTTPCalls.getAPIGW(https);
            const wrappedFunc = thundraWrapper(originalFunction);

            return wrappedFunc(originalEvent, originalContext).then(() => {
                const { tracer } = ExecutionContextManager.get();
                console.log('<<< SECURITY TEST APIGateway >>>');
                console.log(tracer.recorder.spanList);
                const span = tracer.recorder.spanList[1];
                checkIfWhitelisted(span);
            });
        });
    });

    describe('using elasticsearch integration', () => {
        const es = require('elasticsearch');

        test('should whitelist es query operation', () => {
            const originalFunction = () => ESCalls.query(es);
            const wrappedFunc = thundraWrapper(originalFunction);

            return wrappedFunc(originalEvent, originalContext).then(() => {
                const { tracer } = ExecutionContextManager.get();
                const span = tracer.recorder.spanList[1];
                checkIfWhitelisted(span);
            });
        });
    });

    describe('using redis integration', () => {
        const redis = require('redis');
        const ioredis = require('ioredis');

        test('should whitelist redis query operation', () => {
            const originalFunction = () => RedisCalls.set(redis);
            const wrappedFunc = thundraWrapper(originalFunction);

            return wrappedFunc(originalEvent, originalContext).then(() => {
                const { tracer } = ExecutionContextManager.get();
                for (const span of tracer.recorder.spanList) {
                    if (span.tags['redis.command.type'] === 'WRITE') {
                        checkIfWhitelisted(span);
                        break;
                    }
                }
            });
        });

        test('should whitelist ioredis query operation', () => {
            const originalFunction = () => RedisCalls.set(ioredis);
            const wrappedFunc = thundraWrapper(originalFunction);

            return wrappedFunc(originalEvent, originalContext).then(() => {
                const { tracer } = ExecutionContextManager.get();
                for (const span of tracer.recorder.spanList) {
                    if (span.tags['redis.command.type'] === 'WRITE') {
                        checkIfWhitelisted(span);
                        break;
                    }
                }
            });
        });
    });

    describe('using mysql integration', () => {
        const mysql = require('mysql');
        const mysql2 = require('mysql2');

        test('should whitelist mysql operation', () => {
            const originalFunction = () => MySQLCalls.selectMySql(mysql);
            const wrappedFunc = thundraWrapper(originalFunction);

            return wrappedFunc(originalEvent, originalContext).then(() => {
                const { tracer } = ExecutionContextManager.get();
                const span = tracer.recorder.spanList[1];
                checkIfWhitelisted(span);
            });
        });

        test('should whitelist mysql2 operation', () => {
            const originalFunction = () => MySQLCalls.selectMySql2(mysql2);
            const wrappedFunc = thundraWrapper(originalFunction);

            return wrappedFunc(originalEvent, originalContext).then(() => {
                const { tracer } = ExecutionContextManager.get();
                const span = tracer.recorder.spanList[1];
                checkIfWhitelisted(span);
            });
        });
    });

    describe('using mongodb integration', () => {
        const mongodb = require('mongodb');

        test('should whitelist mongodb operation', () => {
            const originalFunction = () => MongoCalls.dropCollection(mongodb);
            const wrappedFunc = thundraWrapper(originalFunction);

            return wrappedFunc(originalEvent, originalContext).then(() => {
                const { tracer } = ExecutionContextManager.get();
                const span = tracer.recorder.spanList[1];
                checkIfWhitelisted(span);
            });
        });
    });

});

describe('blacklist config', () => {
    let thundraWrapper;
    const config = {
        type: 'SecurityAwareSpanListener',
        config: {
            block: true,
            blacklist: operationList,
        }
    };
    const securityErrorType = 'SecurityError';
    const securityErrorMessage = 'Operation was blocked due to security configuration';
    const originalEvent = { key: 'value' };
    const originalContext = createMockContext();

    const checkIfBlacklisted = (span) => {
        expect(span.startTime).toBeGreaterThan(0);
        expect(span.finishTime).toBeGreaterThan(0);
        expect(span.getTag('error')).toBeTruthy();
        expect(span.getTag('error.kind')).toEqual(securityErrorType);
        expect(span.getTag('error.message')).toEqual(securityErrorMessage);
        expect(span.getTag(SecurityTags.BLOCKED)).toBeTruthy();
        expect(span.getTag(SecurityTags.VIOLATED)).toBeTruthy();
    };

    beforeAll(() => {
        ConfigProvider.set(ConfigNames.THUNDRA_TRACE_SPAN_LISTENERCONFIG, JSON.stringify(config));
        thundraWrapper = thundra({ apiKey: 'apiKey', timeoutMargin: 0 });
    });

    describe('using aws integration', () => {
        const sdk = require('aws-sdk');
        sdk.config.update({ maxRetries: 0 });

        test('should blacklist dynamodb operation', () => {
            const originalFunction = () => AWSCalls.dynamo(sdk);
            const wrappedFunc = thundraWrapper(originalFunction);

            return wrappedFunc(originalEvent, originalContext).catch(() => {
                const { tracer } = ExecutionContextManager.get();
                const span = tracer.recorder.spanList[1];
                checkIfBlacklisted(span);
            });
        });

        test('should blacklist lambda operation', () => {
            const originalFunction = () => AWSCalls.lambda(sdk);
            const wrappedFunc = thundraWrapper(originalFunction);

            return wrappedFunc(originalEvent, originalContext).catch(() => {
                const { tracer } = ExecutionContextManager.get();
                const span = tracer.recorder.spanList[1];
                checkIfBlacklisted(span);
            });
        });

        test('should blacklist sqs operation', () => {
            const originalFunction = () => AWSCalls.sqs(sdk);
            const wrappedFunc = thundraWrapper(originalFunction);

            return wrappedFunc(originalEvent, originalContext).catch(() => {
                const { tracer } = ExecutionContextManager.get();
                const span = tracer.recorder.spanList[1];
                checkIfBlacklisted(span);
            });
        });

        test('should blacklist s3 operation', () => {
            const originalFunction = () => AWSCalls.s3GetObject(sdk);
            const wrappedFunc = thundraWrapper(originalFunction);

            return wrappedFunc(originalEvent, originalContext).catch(() => {
                const { tracer } = ExecutionContextManager.get();
                const span = tracer.recorder.spanList[1];
                checkIfBlacklisted(span);
            });
        });

        test('should blacklist sns operation', () => {
            const originalFunction = () => AWSCalls.sns_topic(sdk);
            const wrappedFunc = thundraWrapper(originalFunction);

            return wrappedFunc(originalEvent, originalContext).catch(() => {
                const { tracer } = ExecutionContextManager.get();
                const span = tracer.recorder.spanList[1];
                checkIfBlacklisted(span);
            });
        });

        test('should blacklist kinesis operation', () => {
            const originalFunction = () => AWSCalls.kinesis(sdk);
            const wrappedFunc = thundraWrapper(originalFunction);

            return wrappedFunc(originalEvent, originalContext).catch(() => {
                const { tracer } = ExecutionContextManager.get();
                const span = tracer.recorder.spanList[1];
                checkIfBlacklisted(span);
            });
        });

        test('should blacklist firehose operation', () => {
            const originalFunction = () => AWSCalls.kinesis(sdk);
            const wrappedFunc = thundraWrapper(originalFunction);

            return wrappedFunc(originalEvent, originalContext).catch(() => {
                const { tracer } = ExecutionContextManager.get();
                const span = tracer.recorder.spanList[1];
                checkIfBlacklisted(span);
            });
        });

        test('should blacklist athena operation', () => {
            const originalFunction = () => AWSCalls.athenaStartQueryExec(sdk);
            const wrappedFunc = thundraWrapper(originalFunction);

            return wrappedFunc(originalEvent, originalContext).catch(() => {
                const { tracer } = ExecutionContextManager.get();
                const span = tracer.recorder.spanList[1];
                checkIfBlacklisted(span);
            });
        });
    });

    describe('using http integration', () => {
        const http = require('http');
        const https = require('https');

        test('should blacklist http get operation', () => {
            const originalFunction = () => HTTPCalls.get(http);
            const wrappedFunc = thundraWrapper(originalFunction);

            return wrappedFunc(originalEvent, originalContext).catch(() => {
                const { tracer } = ExecutionContextManager.get();
                const span = tracer.recorder.spanList[1];
                checkIfBlacklisted(span);
            });
        });

        test('should blacklist api-gateway get operation', () => {
            const originalFunction = () => HTTPCalls.getAPIGW(https);
            const wrappedFunc = thundraWrapper(originalFunction);

            return wrappedFunc(originalEvent, originalContext).catch(() => {
                const { tracer } = ExecutionContextManager.get();
                const span = tracer.recorder.spanList[1];
                checkIfBlacklisted(span);
            });
        });
    });

    describe('using elasticsearch integration', () => {
        const es = require('elasticsearch');

        test('should blacklist es query operation', () => {
            const originalFunction = () => ESCalls.query(es);
            const wrappedFunc = thundraWrapper(originalFunction);

            return wrappedFunc(originalEvent, originalContext).catch(() => {
                const { tracer } = ExecutionContextManager.get();
                const span = tracer.recorder.spanList[1];
                checkIfBlacklisted(span);
            });
        });
    });

    describe.skip('using redis integration', () => {
        const redis = require('redis');
        const ioredis = require('ioredis');

        test('should blacklist redis query operation', () => {
            const originalFunction = () => RedisCalls.set(redis);
            const wrappedFunc = thundraWrapper(originalFunction);

            return wrappedFunc(originalEvent, originalContext).catch(() => {
                const { tracer } = ExecutionContextManager.get();
                for (const span of tracer.recorder.spanList) {
                    if (span.tags['redis.command.type'] === 'WRITE') {
                        checkIfBlacklisted(span);
                        break;
                    }
                }
            });
        });

        test('should blacklist ioredis query operation', () => {
            const originalFunction = () => RedisCalls.set(ioredis);
            const wrappedFunc = thundraWrapper(originalFunction);

            return wrappedFunc(originalEvent, originalContext).catch(() => {
                const { tracer } = ExecutionContextManager.get();
                for (const span of tracer.recorder.spanList) {
                    if (span.tags['redis.command.type'] === 'WRITE') {
                        checkIfBlacklisted(span);
                        break;
                    }
                }
            });
        });
    });

    describe('using mysql integration', () => {
        const mysql = require('mysql');
        const mysql2 = require('mysql2');

        test('should blacklist mysql operation', () => {
            const originalFunction = () => MySQLCalls.selectMySql(mysql);
            const wrappedFunc = thundraWrapper(originalFunction);

            return wrappedFunc(originalEvent, originalContext).catch(() => {
                const { tracer } = ExecutionContextManager.get();
                const span = tracer.recorder.spanList[1];
                checkIfBlacklisted(span);
            });
        });

        test('should blacklist mysql2 operation', () => {
            const originalFunction = () => MySQLCalls.selectMySql2(mysql2);
            const wrappedFunc = thundraWrapper(originalFunction);

            return wrappedFunc(originalEvent, originalContext).catch(() => {
                const { tracer } = ExecutionContextManager.get();
                const span = tracer.recorder.spanList[1];
                checkIfBlacklisted(span);
            });
        });
    });

    describe('using mongodb integration', () => {
        const mongodb = require('mongodb');

        test('should blacklist mongodb operation', () => {
            const originalFunction = () => MongoCalls.dropCollection(mongodb);
            const wrappedFunc = thundraWrapper(originalFunction);

            return wrappedFunc(originalEvent, originalContext).catch(() => {
                const { tracer } = ExecutionContextManager.get();
                const span = tracer.recorder.spanList[1];
                checkIfBlacklisted(span);
            });
        });
    });

});
