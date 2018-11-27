module.exports.dynamo = (AWS) => {
    return new Promise((resolve) => {
        AWS.config.update({ region: 'us-west-2' });
        const ddb = new AWS.DynamoDB({ apiVersion: '2012-10-08', dynamoDbCrc32: false });
        const params = {
            TableName: 'test-table',
            Key: {
                'id': { S: '1' },
            },
        };

        ddb.getItem(params, function (err, data) {
            if (err) {
                // Resolve even though there is an error.
                return resolve(err);
            }
            return resolve(data);
        });
    });
};

module.exports.s3 = (AWS) => {
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
        sqs.listQueues(params, function(err, data) {
            if (err) {
                // Resolve even though there is an error.
                return resolve(err);
            }
            return resolve(data);
        });
    });
};

module.exports.sns = (AWS) => {
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


