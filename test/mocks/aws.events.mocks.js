const createKinesisMockEvent = () => {
    return {
        Records: [
            {
                kinesis: {
                    partitionKey: 'partitionKey-03',
                    kinesisSchemaVersion: '1.0',
                    data: 'SGVsbG8sIHRoaXMgaXMgYSB0ZXN0IDEyMy4=',
                    sequenceNumber: '49545115243490985018280067714973144582180062593244200961',
                    approximateArrivalTimestamp: 1428537600
                },
                eventSource: 'aws:kinesis',
                eventID: 'shardId-000000000000:49545115243490985018280067714973144582180062593244200961',
                invokeIdentityArn: 'arn:aws:iam::EXAMPLE',
                eventVersion: '1.0',
                eventName: 'aws:kinesis:record',
                eventSourceARN: 'arn:aws:kinesis:EXAMPLE',
                awsRegion: 'us-west-2'
            }
        ]
    };
};

const createFirehoseMockEvent = () => {
    return {
        invocationId: 'invocationIdExample',
        deliveryStreamArn: 'arn:aws:kinesis:EXAMPLE',
        region: 'us-west-2',
        records: [
            {
                recordId: '49546986683135544286507457936321625675700192471156785154',
                approximateArrivalTimestamp: 1495072949453,
                data: 'SGVsbG8sIHRoaXMgaXMgYSB0ZXN0IDEyMy4='
            }
        ]
    };
};

const createDynamoDBMockEvent = () => {
    return {
        Records: [
            {
                eventID: 'eccbc87e4b5ce2fe28308fd9f2a7baf3',
                eventName: 'REMOVE',
                eventVersion: '1.1',
                eventSource: 'aws:dynamodb',
                awsRegion: 'us-west-2',
                dynamodb: {
                    Keys: {
                        Id: {
                            N: '101'
                        }
                    },
                    OldImage: {
                        Message: {
                            S: 'This item has changed'
                        },
                        Id: {
                            N: '101'
                        }
                    },
                    ApproximateCreationDateTime: 1428537600,
                    SequenceNumber: '4421584500000000017450439093',
                    SizeBytes: 38,
                    StreamViewType: 'NEW_AND_OLD_IMAGES'
                },
                eventSourceARN: 'arn:aws:dynamodb:us-west-2:123456789012:table/ExampleTableWithStream/stream/2015-06-27T00:48:05.899'
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
                    MessageAttributes: {},
                }
            }
        ]
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
                messageAttributes: {},
                md5OfBody: '7b270e59b47ff90a553787216d55d91d',
                eventSource: 'aws:sqs',
                eventSourceARN: 'arn:aws:sqs:us-west-2:123456789012:MyQueue',
                awsRegion: 'us-west-2'
            }
        ]
    };
};

const createMockS3Event = () => {
    return {
        Records: [
            {
                eventVersion: '2.0',
                eventSource: 'aws:s3',
                awsRegion: 'us-west-2',
                eventTime: '1970-01-01T00:00:00.000Z',
                eventName: 'ObjectCreated:Put',
                userIdentity: {
                    principalId: 'EXAMPLE'
                },
                requestParameters: {
                    sourceIPAddress: '127.0.0.1'
                },
                responseElements: {
                    'x-amz-request-id': 'EXAMPLE123456789',
                    'x-amz-id-2': 'EXAMPLE123/5678abcdefghijklambdaisawesome/mnopqrstuvwxyzABCDEFGH'
                },
                s3: {
                    s3SchemaVersion: '1.0',
                    configurationId: 'testConfigRule',
                    bucket: {
                        name: 'example-bucket',
                        ownerIdentity: {
                            'principalId': 'EXAMPLE'
                        },
                        arn: 'arn:aws:s3:::example-bucket'
                    },
                    object: {
                        key: 'test/key',
                        size: 1024,
                        eTag: '0123456789abcdef0123456789abcdef',
                        sequencer: '0A1B2C3D4E5F678901'
                    }
                }
            }
        ]
    };
};

const createMockCloudWatchScheduledEvent = () => {
    return {
        id: 'cdc73f9d-aea9-11e3-9d5a-835b769c0d9c',
        'detail-type': 'Scheduled Event',
        source: 'aws.events',
        account: '{{account-id}}',
        time: '1970-01-01T00:00:00Z',
        region: 'us-west-2',
        resources: [
            'arn:aws:events:us-west-2:123456789012:rule/ExampleRule'
        ],
        detail: {}
    };
};

const createMockCloudWatchLogEvent = () => {
    return {
        'awslogs': {
            'data': 'H4sIAAAAAAAAAHWPwQqCQBCGX0Xm7EFtK+smZBEUgXoLCdMhFtKV3akI8d0bLYmibvPPN3wz00CJxmQnTO41whwWQRIctmEcB6sQbFC3CjW3XW8kxpOpP+OC22d1Wml1qZkQGtoMsScxaczKN3plG8zlaHIta5KqWsozoTYw3/djzwhpLwivWFGHGpAFe7DL68JlBUk+l7KSN7tCOEJ4M3/qOI49vMHj+zCKdlFqLaU2ZHV2a4Ct/an0/ivdX8oYc1UVX860fQDQiMdxRQEAAA=='
        }
    };
};

const createMockCloudFrontEvent = () => {
    return {
        Records: [
            {
                cf: {
                    config: {
                        'distributionId': 'EXAMPLE'
                    },
                    request: {
                        uri: '/test',
                        method: 'GET',
                        clientIp: '2001:cdba::3257:9652',
                        headers: {
                            host: [
                                {
                                    key: 'Host',
                                    value: 'd123.cf.net'
                                }
                            ],
                            'user-agent': [
                                {
                                    key: 'User-Agent',
                                    value: 'Test Agent'
                                }
                            ],
                            'user-name': [
                                {
                                    key: 'User-Name',
                                    value: 'aws-cloudfront'
                                }
                            ]
                        }
                    }
                }
            }
        ]
    };
};


const createMockAPIGatewayProxyEvent = () => {
    return {
        body: 'eyJ0ZXN0IjoiYm9keSJ9',
        resource: '/{proxy+}',
        path: '/path/to/resource',
        httpMethod: 'POST',
        isBase64Encoded: true,
        queryStringParameters: {
            foo: 'bar'
        },
        pathParameters: {
            'proxy': '/path/to/resource'
        },
        'stageVariables': {
            'baz': 'qux'
        },
        headers: {
            Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
            'Accept-Encoding': 'gzip, deflate, sdch',
            'Accept-Language': 'en-US,en;q=0.8',
            'Cache-Control': 'max-age=0',
            'CloudFront-Forwarded-Proto': 'https',
            'CloudFront-Is-Desktop-Viewer': 'true',
            'CloudFront-Is-Mobile-Viewer': 'false',
            'CloudFront-Is-SmartTV-Viewer': 'false',
            'CloudFront-Is-Tablet-Viewer': 'false',
            'CloudFront-Viewer-Country': 'US',
            Host: '1234567890.execute-api.us-west-2.amazonaws.com',
            'Upgrade-Insecure-Request': '1',
            'User-Agent': 'Custom User Agent String',
            Via: '1.1 08f323deadbeefa7af34d5feb414ce27.cloudfront.net (CloudFront)',
            'X-Amz-Cf-Id': 'cDehVQoZnx43VYQb9j2-nvCh-9z396Uhbp027Y2JvkCPNLmGJHqlaA==',
            'X-Forwarded-For': '127.0.0.1, 127.0.0.2',
            'X-Forwarded-Port': '443',
            'X-Forwarded-Proto': 'https'
        },
        requestContext: {
            accountId: '123456789012',
            resourceId: '123456',
            stage: 'prod',
            requestId: 'c6af9ac6-7b61-11e6-9a41-93e8deadbeef',
            requestTime: '09/Apr/2015:12:34:56 +0000',
            requestTimeEpoch: 1428582896000,
            identity: {
                cognitoIdentityPoolId: null,
                accountId: null,
                cognitoIdentityId: null,
                caller: null,
                accessKey: null,
                sourceIp: '127.0.0.1',
                cognitoAuthenticationType: null,
                cognitoAuthenticationProvider: null,
                userArn: null,
                userAgent: 'Custom User Agent String',
                user: null
            },
            path: '/prod/path/to/resource',
            resourcePath: '/{proxy+}',
            httpMethod: 'POST',
            apiId: '1234567890',
            protocol: 'HTTP/1.1'
        }
    };
};


module.exports = {
    createMockAPIGatewayProxyEvent,
    createMockCloudFrontEvent,
    createMockCloudWatchLogEvent,
    createMockCloudWatchScheduledEvent,
    createMockS3Event,
    createMockSQSEvent,
    createMockSNSEvent,
    createDynamoDBMockEvent,
    createFirehoseMockEvent,
    createKinesisMockEvent,
};