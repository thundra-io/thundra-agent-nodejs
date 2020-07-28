'use strict';

const thundra = require('@thundra/core');

// Lambda wrapper should be created and initialized before user handler.
const lambdaWrapper = thundra.createLambdaWrapper();

// Load user handler
const userHandler = thundra.loadUserHandler();

// Wrap user handler with Lambda wrapper
const wrappedUserHandler = lambdaWrapper(userHandler);

// Export wrapper user handler
exports.wrapper = (event: any, context: any, callback: any) => {
    return wrappedUserHandler(event, context, callback);
};
