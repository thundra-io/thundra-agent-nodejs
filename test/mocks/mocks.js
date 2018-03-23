const createMockContext = () => {
    return {
        callbackWaitsForEmptyEventLoop: true,
        done: jest.fn(),
        succeed: jest.fn(),
        fail: jest.fn(),
        logGroupName: "/aws/lambda/test",
        logStreamName: "2018/03/07/[$LATEST]test",
        functionName: "test",
        memoryLimitInMB: "128",
        functionVersion: "$LATEST",
        getRemainingTimeInMillis: jest.fn(),
        invokeid: "invokeId",
        awsRequestId: "awsRequestId",
        invokedFunctionArn: "arn:aws:lambda:us-west-2:123456789123:function:test"
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
        apiKey: "apiKey",
        originalContext: createMockContext(),
        originalEvent: {key: "data"},
        coldStart: "false",
        reporter: createMockReporterInstance()
    };
};

const createMockPlugin = () => {
    return {
        hooks: {"not-a-real-hook": jest.fn()}
    };
};

module.exports = {
    createMockContext,
    createMockReporterInstance,
    createMockWrapperInstance,
    createMockPlugin
};