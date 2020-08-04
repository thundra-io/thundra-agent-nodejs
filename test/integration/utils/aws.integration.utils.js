module.exports.dynamo = (AWS) => {
    return new Promise((resolve) => {
        AWS.config.update({ region: 'us-west-2' });
        const ddb = new AWS.DynamoDB({ apiVersion: '2012-10-08', dynamoDbCrc32: false });
        const params = {
            Item: { 'id': { S: '1' } },
            TableName: 'test-table',
        };
        ddb.putItem(params, function (err, data) {
            if (err) {
                // Resolve even though there is an error.
                return resolve(err);
            }
            return resolve(data);
        });
    });
};

module.exports.stepfn = (AWS) => {
    return new Promise((resolve) => {
        AWS.config.update({ region: 'us-west-2' });
        const stepfn = new AWS.StepFunctions();
        const params = {
            stateMachineArn: 'arn:aws:states:us-west-2:123123123123:stateMachine:FooStateMachine',
            input: '{}',
            name: 'exec_name'
        };
        stepfn.startExecution(params, function (err, data) {
            if (err) {
                // Resolve even though there is an error.
                return resolve(err);
            }
            return resolve(data);
        });
    });
}

module.exports.s3GetObject = (AWS) => {
    return new Promise((resolve) => {
        AWS.config.update({ region: 'us-west-2', maxRetries: 0 });
        const s3 = new AWS.S3();
        var getParams = {
            Bucket: 'test',
            Key: 'test.txt'
        };

        s3.getObject(getParams, function (err, data) {
            if (err) {
                // Resolve even though there is an error.
                return resolve(err);
            }
            return resolve(data);
        });
    });
};

module.exports.s3ListBuckets = (AWS) => {
    return new Promise((resolve) => {
        AWS.config.update({ region: 'us-west-2' });
        const s3 = new AWS.S3();
        var params = {};

        s3.listBuckets(params, function (err, data) {
            if (err) {
                // Resolve even though there is an error.
                return resolve(err);
            }
            return resolve(data);
        });
    });
};

module.exports.lambda = (AWS) => {
    return new Promise((resolve) => {
        AWS.config.update({ region: 'us-west-2' });
        const lambda = new AWS.Lambda();
        const params = {
            FunctionName: 'Test',
            InvocationType: 'RequestResponse',
            Payload: '{ "name" : "thundra" }'
        };

        lambda.invoke(params, function (err, data) {
            if (err) {
                // Resolve even though there is an error.
                return resolve(err);
            }
            return resolve(data);
        });
    });
};

module.exports.lambdaGetAccountSettings = (AWS) => {
    return new Promise((resolve, reject) => {
        AWS.config.update({ region: 'us-west-2' });
        const lambda = new AWS.Lambda();

        lambda.getAccountSettings().promise().then((data) => {
            return resolve(data);
        }).catch((err) => {
            // Resolve even though there is an error.
            return resolve(err);
        });
    });
};

module.exports.sqs = (AWS) => {
    return new Promise((resolve) => {
        AWS.config.update({ region: 'us-west-2' });
        const sqs = new AWS.SQS();
        const params = {
            MessageBody: 'Hello Thundra!',
            QueueUrl: 'https://sqs.us-east-2.amazonaws.com/123456789012/MyQueue',
            DelaySeconds: 0
        };

        sqs.sendMessage(params, function (err, data) {
            if (err) {
                // Resolve even though there is an error.
                return resolve(err);
            }
            return resolve(data);
        });
    });
};

module.exports.sqs_list_queue = (AWS) => {
    return new Promise((resolve) => {
        AWS.config.update({ region: 'us-west-2' });
        const sqs = new AWS.SQS();
        const params = {};
        sqs.listQueues(params, function (err, data) {
            if (err) {
                // Resolve even though there is an error.
                return resolve(err);
            }
            return resolve(data);
        });
    });
};

module.exports.sns_topic = (AWS) => {
    return new Promise((resolve) => {
        AWS.config.update({ region: 'us-west-2' });
        const sns = new AWS.SNS({ apiVersion: '2010-03-31' });
        const params = {
            Message: 'Hello Thundra!',
            TopicArn: 'TEST_TOPIC'
        };

        sns.publish(params, function (err, data) {
            if (err) {
                // Resolve even though there is an error.
                return resolve(err);
            }
            return resolve(data);
        });
    });
};

module.exports.sns_target = (AWS) => {
    return new Promise((resolve) => {
        AWS.config.update({ region: 'us-west-2' });
        const sns = new AWS.SNS({ apiVersion: '2010-03-31' });
        const params = {
            Message: 'Hello Thundra!',
            TargetArn: 'TEST_TARGET'
        };

        sns.publish(params, function (err, data) {
            if (err) {
                // Resolve even though there is an error.
                return resolve(err);
            }
            return resolve(data);
        });
    });
};

module.exports.sns_sms = (AWS) => {
    return new Promise((resolve) => {
        AWS.config.update({ region: 'us-west-2' });
        const sns = new AWS.SNS({ apiVersion: '2010-03-31' });
        const params = {
            Message: 'Hello Thundra!',
            PhoneNumber: '+901234567890'
        };

        sns.publish(params, function (err, data) {
            if (err) {
                // Resolve even though there is an error.
                return resolve(err);
            }
            return resolve(data);
        });
    });
};

module.exports.sns_checkIfPhoneNumberIsOptedOut = (AWS) => {
    return new Promise((resolve) => {
        AWS.config.update({ region: 'us-west-2' });
        const sns = new AWS.SNS({ apiVersion: '2010-03-31' });
        const params = {
            phoneNumber: 'STRING_VALUE' /* required */
        };

        sns.checkIfPhoneNumberIsOptedOut(params, function (err, data) {
            if (err) {
                // Resolve even though there is an error.
                return resolve(err);
            }
            return resolve(data);
        });
    });
};

module.exports.kinesis = (AWS) => {
    return new Promise((resolve) => {
        AWS.config.update({ region: 'us-west-2' });
        const kinesis = new AWS.Kinesis({ apiVersion: '2013-12-02' });
        const params = {
            Data: 'STRING_VALUE',
            PartitionKey: 'STRING_VALUE',
            StreamName: 'STRING_VALUE',
            ExplicitHashKey: 'STRING_VALUE',
            SequenceNumberForOrdering: 'STRING_VALUE'
        };

        kinesis.putRecord(params, function (err, data) {
            if (err) {
                // Resolve even though there is an error.
                return resolve(err);
            }
            return resolve(data);
        });
    });
};

module.exports.firehose = (AWS) => {
    return new Promise((resolve) => {
        AWS.config.update({ region: 'us-west-2' });
        const firehose = new AWS.Firehose({ apiVersion: '2015-08-04' });
        const params = {
            DeliveryStreamName: 'STRING_VALUE',
            Record: {
                Data: 'STRING_VALUE'
            }
        };

        firehose.putRecord(params, function (err, data) {
            if (err) {
                // Resolve even though there is an error.
                return resolve(err);
            }
            return resolve(data);
        });
    });
};

module.exports.kms = (AWS) => {
    return new Promise((resolve) => {
        AWS.config.update({ region: 'us-west-2' });
        const kms = new AWS.KMS({ apiVersion: '2015-08-04' });
        var params = {
            BypassPolicyLockoutSafetyCheck: true || false,
            CustomKeyStoreId: 'STRING_VALUE',
            Description: 'STRING_VALUE',
            Policy: 'STRING_VALUE',
            Tags: [
                {
                    TagKey: 'STRING_VALUE', /* required */
                    TagValue: 'STRING_VALUE' /* required */
                },
                /* more items */
            ]
        };
        kms.createKey(params, function (err, data) {
            if (err) return resolve(err); // an error occurred
            else return resolve(data);         // successful response
        });
    });
};

module.exports.s3_with_promise = (AWS) => {
    return new Promise((resolve, reject) => {
        AWS.config.update({ region: 'us-west-2' });
        const s3 = new AWS.S3();
        var params = {
            Bucket: 'bucket',
            Key: 'example2.txt',
            Body: 'Uploaded text using the promise-based method!'
        };

        s3.putObject(params).promise().then((data) => {
            return resolve(data);
        }).catch((err) => {
            // Resolve even though there is an error.
            return resolve(err);
        });
    });
};

module.exports.athenaStartQueryExec = (AWS) => {
    return new Promise((resolve, reject) => {
        AWS.config.update({ region: 'us-west-2' });
        const athena = new AWS.Athena();
        var params = {
            QueryString: 'sample-query',
            QueryExecutionContext: {
                Database: 'sample-db',
            },
            ResultConfiguration: {
                OutputLocation: 'sample-output-location',
            },
        };

        athena.startQueryExecution(params, (err, data) => {
            if (err) {
                return resolve(err);
            }
            return resolve(data);
        });
    });
};

module.exports.athenaStopQueryExec = (AWS) => {
    return new Promise((resolve, reject) => {
        AWS.config.update({ region: 'us-west-2' });
        const athena = new AWS.Athena();
        var params = {
            QueryExecutionId: 'sample-query-execution-id',
        };

        athena.stopQueryExecution(params, (err, data) => {
            if (err) {
                return resolve(err);
            }
            return resolve(data);
        });
    });
};

module.exports.athenaBatchGetNamedQuery = (AWS) => {
    return new Promise((resolve, reject) => {
        AWS.config.update({ region: 'us-west-2' });
        const athena = new AWS.Athena();
        var params = {
            NamedQueryIds: ['sample-id-1', 'sample-id-2'],
        };

        athena.batchGetNamedQuery(params, (err, data) => {
            if (err) {
                return resolve(err);
            }
            return resolve(data);
        });
    });
};

module.exports.athenaBatchGetQueryExec = (AWS) => {
    return new Promise((resolve, reject) => {
        AWS.config.update({ region: 'us-west-2' });
        const athena = new AWS.Athena();
        var params = {
            QueryExecutionIds: ['sample-id-1', 'sample-id-2'],
        };

        athena.batchGetQueryExecution(params, (err, data) => {
            if (err) {
                return resolve(err);
            }
            return resolve(data);
        });
    });
};

module.exports.athenaCreateNamedQuery = (AWS) => {
    return new Promise((resolve, reject) => {
        AWS.config.update({ region: 'us-west-2' });
        const athena = new AWS.Athena();
        var params = {
            QueryString: 'sample-query',
            Database: 'sample-db',
            Name: 'sample-name',
        };

        athena.createNamedQuery(params, (err, data) => {
            if (err) {
                return resolve(err);
            }
            return resolve(data);
        });
    });
};

module.exports.eventBridgePutEvent = (AWS) => {
    return new Promise((resolve, reject) => {
        AWS.config.update({ region: 'us-west-2' });
        const eventBridge = new AWS.EventBridge();

        var params = {
            Entries: [
                {
                    Detail: '{\n        \"severity\": \"info\"\n    }',
                    DetailType: 'detail-type-1',
                    EventBusName: 'default',
                    Resources: [
                        'Resources',

                    ],
                    Source: 'Source-1',
                    Time: new Date || 'Wed Dec 31 1969 16:00:00 GMT-0800 (PST)' || 123456789
                },
                {
                    Detail: '{\n        \"severity\": \"error\"\n    }',
                    DetailType: 'detail-type-2',
                    EventBusName: 'default',
                    Resources: [
                        'Resources',

                    ],
                    Source: 'Source-2',
                    Time: new Date || 'Wed Dec 31 1969 16:00:00 GMT-0800 (PST)' || 123456789
                },

            ]
        };
        eventBridge.putEvents(params, (err, data) => {
            if (err) {
                return resolve(err);
            }
            return resolve(data);
        });
    });

};

module.exports.eventBridgePutEventDifferentBus = (AWS) => {
    return new Promise((resolve, reject) => {
        AWS.config.update({ region: 'us-west-2' });
        const eventBridge = new AWS.EventBridge();

        var params = {
            Entries: [
                {
                    Detail: '{\n        \"severity\": \"info\"\n    }',
                    DetailType: 'detail-type-1',
                    EventBusName: 'default-1',
                    Resources: [
                        'Resources',

                    ],
                    Source: 'Source-1',
                    Time: new Date || 'Wed Dec 31 1969 16:00:00 GMT-0800 (PST)' || 123456789
                },
                {
                    Detail: '{\n        \"severity\": \"error\"\n    }',
                    DetailType: 'detail-type-2',
                    EventBusName: 'default-2',
                    Resources: [
                        'Resources',

                    ],
                    Source: 'Source-2',
                    Time: new Date || 'Wed Dec 31 1969 16:00:00 GMT-0800 (PST)' || 123456789
                },

            ]
        };
        eventBridge.putEvents(params, (err, data) => {
            if (err) {
                return resolve(err);
            }
            return resolve(data);
        });
    });
};

module.exports.eventBridgeListEventBuses = (AWS) => {
    return new Promise((resolve, reject) => {
        AWS.config.update({ region: 'us-west-2' });
        const eventBridge = new AWS.EventBridge();
        eventBridge.listEventBuses({}, (err, data) => {
            if (err) {
                return resolve(err);
            }
            return resolve(data);
        });
    });
};

module.exports.sesSendEmail = (AWS) => {
    return new Promise((resolve, reject) => {
        AWS.config.update({ region: 'us-west-2' });
        const ses = new AWS.SES();
        ses.sendEmail({
            Source: 'demo@thundra.io',
            Destination: { ToAddresses: ['test@thundra.io'], CcAddresses: ['test-cc@thundra.io'], },
            Message: {
                Subject: { Data: 'Test Subject', Charset: 'UTF-8' },
                Body: {
                    Text: { Data: 'Test Body', Charset: 'UTF-8' },
                    Html: { Data: '<html><body>test</body></html>', Charset: 'UTF-8' }
                }
            }
        }, (err, data) => {
            resolve(err || data);
        });
    });
};

module.exports.sesSendRawEmail = (AWS) => {
    return new Promise((resolve, reject) => {
        AWS.config.update({ region: 'us-west-2' });
        const ses = new AWS.SES();
        ses.sendRawEmail({
            Source: 'demo@thundra.io',
            Destinations: ['test@thundra.io'],
            RawMessage: {
                Data: 'Test', Charset: 'UTF-8',
            }
        }, (err, data) => {
            resolve(err || data);
        });
    });
};

module.exports.sesSendTemplatedEmail = (AWS) => {
    return new Promise((resolve, reject) => {
        AWS.config.update({ region: 'us-west-2' });
        const ses = new AWS.SES();
        ses.sendTemplatedEmail({
            Source: 'demo@thundra.io',
            Destination: { ToAddresses: ['test@thundra.io'], },
            Template: 'TestTemplate',
            TemplateData: '{"testkey": "testvalue"}',
            TemplateArn: 'test'
        }, (err, data) => {
            resolve(err || data);
        });
    });
};
