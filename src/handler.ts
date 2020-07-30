/**
 * Provides Thundra handler to wrap the original AWS Lambda handler
 */

'use strict';

const thundra = require('@thundra/core');

// Lambda wrapper should be created and initialized before user handler.
const lambdaWrapper = thundra.createLambdaWrapper();

// Load user handler
const userHandler = thundra.loadUserHandler();

// Wrap user handler with Lambda wrapper
const wrappedUserHandler = lambdaWrapper(userHandler);

/**
 *
 * @param event the AWS Lambda invocation the event
 * @param context the AWS Lambda invocation context
 * @param callback the AWS Lambda invocation callback
 * @return the wrapped handler
 */
// Export wrapper user handler
exports.wrapper = (event: any, context: any, callback: any) => {
    return wrappedUserHandler(event, context, callback);
};
