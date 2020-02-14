const thundra = require('../dist/index');
import Utils from '../dist/plugins/utils/Utils';
import { createMockContext } from './mocks/mocks';
import { envVariableKeys, SecurityTags, ClassNames } from '../dist/Constants';
import AWSCalls from './integration/utils/aws.integration.utils';
import HTTPCalls from './integration/utils/http.integration.utils';
import ESCalls from './integration/utils/es.integration.utils';
import RedisCalls from './integration/utils/redis.integration.utils';
import MySQLCalls from './integration/utils/mysql.integration.utils';
import MongoCalls from './integration/utils/mongodb.integration.utils';
import ThundraWrapper from '../dist/ThundraWrapper';
import Recorder from '../dist/opentracing/Recorder';
import AWSIntegration from '../dist/plugins/integrations/AWSIntegration';

const operationList = [
    {
        className: ClassNames.DYNAMODB,
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
        className: ClassNames.LAMBDA,
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
        className: ClassNames.SQS,
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
        className: ClassNames.S3,
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
        className: ClassNames.SNS,
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
        className: ClassNames.KINESIS,
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
        className: ClassNames.FIREHOSE,
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
        className: ClassNames.ATHENA,
        tags: {
            "db.instance": [
                "sample-db"
            ],
            "operation.type": [
                "WRITE"
            ]
        }
    },
    {
        className: ClassNames.HTTP,
        tags: {
            "http.host": [
                "jsonplaceholder.typicode.com",
                "34zsqapxkj.execute-api.eu-west-1.amazonaws.com"
            ],
            "operation.type": [
                "GET"
            ]
        }
    },
    {
        className: ClassNames.ELASTICSEARCH,
        tags: {
            "elasticsearch.normalized_uri": [
                "/twitter"
            ],
            "operation.type": [
                "POST"
            ]
        }
    },
    {
        className: ClassNames.REDIS,
        tags: {
            "redis.host": [
                "127.0.0.1",
                "localhost"
            ],
            "operation.type": [
                "WRITE"
            ]
        }
    },
    {
        className: ClassNames.MYSQL,
        tags: {
            "db.instance": [
                "db"
            ],
            "operation.type": [
                "READ"
            ]
        }
    },
    {
        className: ClassNames.MONGODB,
        tags: {
            "db.instance": [
                "testDB"
            ],
            "operation.type": [
                "DELETE"
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
            whitelist: operationList,
        }
    };
    
    let thundraWrapper;
    let recorder;
    const originalEvent = { key: 'value' }
    const originalContext = createMockContext();
    
    const clearRecorder = (recorder) => {
        recorder.activeSpanStack.clear();
        recorder.spanList = [];
        recorder.spanOrder = 1;
    };

    const checkIfWhitelisted = (span) => {
        expect(span.tags[SecurityTags.BLOCKED]).toBeUndefined();
        expect(span.tags[SecurityTags.VIOLATED]).toBeUndefined();
        expect(span.startTime).toBeGreaterThan(0);
        expect(span.finishTime).toBeGreaterThan(0);
    };

    beforeAll(() => {
        process.env[envVariableKeys.THUNDRA_AGENT_LAMBDA_SPAN_LISTENER_DEF] = JSON.stringify(config);
        thundraWrapper = thundra({apiKey: 'apiKey', timeoutMargin: 0});;
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
                checkIfWhitelisted(span);
            });
        });
        
        test('should whitelist lambda operation', () => {
            const originalFunction = () => AWSCalls.lambda(sdk);
            const wrappedFunc = thundraWrapper(originalFunction);

            return wrappedFunc(originalEvent, originalContext).then(() => {
                const span = recorder.spanList[1];
                checkIfWhitelisted(span);
            });
        });
        
        test('should whitelist sqs operation', () => {
            const originalFunction = () => AWSCalls.sqs(sdk);
            const wrappedFunc = thundraWrapper(originalFunction);

            return wrappedFunc(originalEvent, originalContext).then(() => {
                const span = recorder.spanList[1];
                checkIfWhitelisted(span);
            });
        });
        
        test('should whitelist s3 operation', () => {
            const originalFunction = () => AWSCalls.s3GetObject(sdk);
            const wrappedFunc = thundraWrapper(originalFunction);

            return wrappedFunc(originalEvent, originalContext).then(() => {
                const span = recorder.spanList[1];
                checkIfWhitelisted(span);
            });
        });
        
        test('should whitelist sns operation', () => {
            const originalFunction = () => AWSCalls.sns_topic(sdk);
            const wrappedFunc = thundraWrapper(originalFunction);

            return wrappedFunc(originalEvent, originalContext).then(() => {
                const span = recorder.spanList[1];
                checkIfWhitelisted(span);
            });
        });
        
        test('should whitelist kinesis operation', () => {
            const originalFunction = () => AWSCalls.kinesis(sdk);
            const wrappedFunc = thundraWrapper(originalFunction);

            return wrappedFunc(originalEvent, originalContext).then(() => {
                const span = recorder.spanList[1];
                checkIfWhitelisted(span);
            });
        });
        
        test('should whitelist firehose operation', () => {
            const originalFunction = () => AWSCalls.kinesis(sdk);
            const wrappedFunc = thundraWrapper(originalFunction);

            return wrappedFunc(originalEvent, originalContext).then(() => {
                const span = recorder.spanList[1];
                checkIfWhitelisted(span);
            });
        });
        
        test('should whitelist athena operation', () => {
            const originalFunction = () => AWSCalls.athenaStartQueryExec(sdk);
            const wrappedFunc = thundraWrapper(originalFunction);

            return wrappedFunc(originalEvent, originalContext).then(() => {
                const span = recorder.spanList[1];
                checkIfWhitelisted(span);
            });
        });
    });

    describe('using http integration', () => {
        const http = require('http');
        const https = require('https');

        test('should whitelist http get operation', () => {
            const originalFunction = () => HTTPCalls.get(http);
            const wrappedFunc = thundraWrapper(originalFunction);

            return wrappedFunc(originalEvent, originalContext).then(() => {
                const span = recorder.spanList[1];
                checkIfWhitelisted(span);
            });
        });
        
        test('should whitelist api-gateway get operation', () => {
            const originalFunction = () => HTTPCalls.getAPIGW(https);
            const wrappedFunc = thundraWrapper(originalFunction);

            return wrappedFunc(originalEvent, originalContext).then(() => {
                const span = recorder.spanList[1];
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
                const span = recorder.spanList[1];
                checkIfWhitelisted(span);
            });;
        })
    });

    describe('using redis integration', () => {
        const redis = require('redis');
        const ioredis = require('ioredis');

        test('should whitelist redis query operation', () => {
            const originalFunction = () => RedisCalls.set(redis);
            const wrappedFunc = thundraWrapper(originalFunction);

            return wrappedFunc(originalEvent, originalContext).then(() => {
                for (const span of recorder.spanList) {
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
                for (const span of recorder.spanList) {
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
                const span = recorder.spanList[1];
                checkIfWhitelisted(span);
            });
        });
        
        test('should whitelist mysql2 operation', () => {
            const originalFunction = () => MySQLCalls.selectMySql2(mysql2);
            const wrappedFunc = thundraWrapper(originalFunction);

            return wrappedFunc(originalEvent, originalContext).then(() => {
                const span = recorder.spanList[1];
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
                const span = recorder.spanList[1];
                checkIfWhitelisted(span);
            });
        });
    });
});

describe('blacklist config', () => {
    let thundraWrapper;
    let recorder;
    const config = {
        type: "SecurityAwareSpanListener",
        config: {
            block: true,
            blacklist: operationList,
        }
    };
    const securityErrorType = 'SecurityError';
    const securityErrorMessage = 'Operation was blocked due to security configuration';
    const originalEvent = { key: 'value' }
    const originalContext = createMockContext();
    
    const clearRecorder = (recorder) => {
        recorder.activeSpanStack.clear();
        recorder.spanList = [];
        recorder.spanOrder = 1;
    };

    const checkIfBlacklisted = (span) => {
        expect(span.startTime).toBeGreaterThan(0);
        expect(span.finishTime).toBeGreaterThan(0);
        expect(span.getTag('error')).toBeTruthy();
        expect(span.getTag('error.kind')).toEqual(securityErrorType);
        expect(span.getTag('error.message')).toEqual(securityErrorMessage);
        expect(span.getTag(SecurityTags.BLOCKED)).toBeTruthy();
        expect(span.getTag(SecurityTags.VIOLATED)).toBeTruthy();
    }

    beforeAll(() => {
        process.env[envVariableKeys.THUNDRA_AGENT_LAMBDA_SPAN_LISTENER_DEF] = JSON.stringify(config);
        thundraWrapper = thundra({apiKey: 'apiKey', timeoutMargin: 0});;
        recorder = thundra.tracer().recorder;
    });

    afterEach(() => {
        clearRecorder(recorder);
    });

    describe('using aws integration', () => {
        const sdk = require('aws-sdk');
        sdk.config.update({ maxRetries: 0 });

        test('should blacklist dynamodb operation', () => {
            const originalFunction = () => AWSCalls.dynamo(sdk);
            const wrappedFunc = thundraWrapper(originalFunction);

            return wrappedFunc(originalEvent, originalContext).catch(() => {
                const span = recorder.spanList[1];
                checkIfBlacklisted(span);
            });
        });
        
        test('should blacklist lambda operation', () => {
            const originalFunction = () => AWSCalls.lambda(sdk);
            const wrappedFunc = thundraWrapper(originalFunction);

            return wrappedFunc(originalEvent, originalContext).catch(() => {
                const span = recorder.spanList[1];
                checkIfBlacklisted(span);
            });
        });
        
        test('should blacklist sqs operation', () => {
            const originalFunction = () => AWSCalls.sqs(sdk);
            const wrappedFunc = thundraWrapper(originalFunction);

            return wrappedFunc(originalEvent, originalContext).catch(() => {
                const span = recorder.spanList[1];
                checkIfBlacklisted(span);
            });
        });
        
        test('should blacklist s3 operation', () => {
            const originalFunction = () => AWSCalls.s3GetObject(sdk);
            const wrappedFunc = thundraWrapper(originalFunction);

            return wrappedFunc(originalEvent, originalContext).catch(() => {
                const span = recorder.spanList[1];
                checkIfBlacklisted(span);
            });
        });
        
        test('should blacklist sns operation', () => {
            const originalFunction = () => AWSCalls.sns_topic(sdk);
            const wrappedFunc = thundraWrapper(originalFunction);

            return wrappedFunc(originalEvent, originalContext).catch(() => {
                const span = recorder.spanList[1];
                checkIfBlacklisted(span);
            });
        });
        
        test('should blacklist kinesis operation', () => {
            const originalFunction = () => AWSCalls.kinesis(sdk);
            const wrappedFunc = thundraWrapper(originalFunction);

            return wrappedFunc(originalEvent, originalContext).catch(() => {
                const span = recorder.spanList[1];
                checkIfBlacklisted(span);
            });
        });
        
        test('should blacklist firehose operation', () => {
            const originalFunction = () => AWSCalls.kinesis(sdk);
            const wrappedFunc = thundraWrapper(originalFunction);

            return wrappedFunc(originalEvent, originalContext).catch(() => {
                const span = recorder.spanList[1];
                checkIfBlacklisted(span);
            });
        });
        
        test('should blacklist athena operation', () => {
            const originalFunction = () => AWSCalls.athenaStartQueryExec(sdk);
            const wrappedFunc = thundraWrapper(originalFunction);

            return wrappedFunc(originalEvent, originalContext).catch(() => {
                const span = recorder.spanList[1];
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
                const span = recorder.spanList[1];
                checkIfBlacklisted(span);
            });
        });
        
        test('should blacklist api-gateway get operation', () => {
            const originalFunction = () => HTTPCalls.getAPIGW(https);
            const wrappedFunc = thundraWrapper(originalFunction);

            return wrappedFunc(originalEvent, originalContext).catch(() => {
                const span = recorder.spanList[1];
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
                const span = recorder.spanList[1];
                checkIfBlacklisted(span);
            });;
        })
    });

    describe.skip('using redis integration', () => {
        const redis = require('redis');
        const ioredis = require('ioredis');

        test('should blacklist redis query operation', () => {
            const originalFunction = () => RedisCalls.set(redis);
            const wrappedFunc = thundraWrapper(originalFunction);

            return wrappedFunc(originalEvent, originalContext).catch(() => {
                for (const span of recorder.spanList) {
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
                for (const span of recorder.spanList) {
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
                const span = recorder.spanList[1];
                checkIfBlacklisted(span);
            });
        });
        
        test('should blacklist mysql2 operation', () => {
            const originalFunction = () => MySQLCalls.selectMySql2(mysql2);
            const wrappedFunc = thundraWrapper(originalFunction);

            return wrappedFunc(originalEvent, originalContext).catch(() => {
                const span = recorder.spanList[1];
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
                const span = recorder.spanList[1];
                checkIfBlacklisted(span);
            });
        });
    });
});