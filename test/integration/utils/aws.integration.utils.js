module.exports.dynamo = (AWS, params) => {
    return new Promise((resolve) => {
        AWS.config.update({ region: 'us-west-2' });
        const ddb = new AWS.DynamoDB({ apiVersion: '2012-10-08', dynamoDbCrc32: false });

        ddb.putItem(params, function (err, data) {
            if (err) {
                // Resolve even though there is an error.
                return resolve(err);
            }
            return resolve(data);
        });
    });
};

module.exports.s3GetObject = (AWS) => {
    return new Promise((resolve) => {
        AWS.config.update({ region: 'us-west-2' });
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
            QueueUrl: 'testqueue',
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


