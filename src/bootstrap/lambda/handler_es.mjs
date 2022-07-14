/**
 * Provides Thundra handler to wrap the original AWS Lambda handler
 */

import { default as createLambdaWrapper } from '@thundra/core';
import { loadUserHandler } from './loader.cjs';

// Lambda wrapper should be created and initialized before user handler.
const lambdaWrapper = createLambdaWrapper();

// Load user handler.
// Since this is an ES module (.mjs), so we can use top-level `await` here.
const userHandler = await loadUserHandler(
    process.env.LAMBDA_TASK_ROOT,
    process.env.THUNDRA_AGENT_LAMBDA_HANDLER,
);

// Wrap user handler with Lambda wrapper
const wrappedUserHandler = lambdaWrapper(userHandler);

/**
 * Wraps the user handler with Thundra handler
 * @param event the AWS Lambda invocation the event
 * @param context the AWS Lambda invocation context
 * @param callback the AWS Lambda invocation callback
 * @return the wrapped handler
 */
// Export wrapper user handler
export function wrapper(event, context, callback) {
    return wrappedUserHandler(event, context, callback);
}
