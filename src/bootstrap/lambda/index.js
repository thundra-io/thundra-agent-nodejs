const ORIGINAL_HANDLER_ENV_VAR_NAME = '_HANDLER';
const THUNDRA_HANDLER_ENV_VAR_NAME = 'THUNDRA_AGENT_LAMBDA_HANDLER';
const LAMBDA_TASK_ROOT_ENV_VAR_NAME = 'LAMBDA_TASK_ROOT';
const JS_FILE_EXTENSION = '.js';

// Get user handler
const userHandler = process.env[ORIGINAL_HANDLER_ENV_VAR_NAME];

// Resolve Thundra handler
const lambdaTaskRoot = process.env[LAMBDA_TASK_ROOT_ENV_VAR_NAME];
let thundraHandler = require.resolve('@thundra/core/dist/handler');
if (thundraHandler.startsWith(lambdaTaskRoot)) {
    thundraHandler = '.' + thundraHandler.substring(lambdaTaskRoot.length);
}
if (thundraHandler.endsWith(JS_FILE_EXTENSION)) {
    thundraHandler = thundraHandler.substring(0, thundraHandler.length - JS_FILE_EXTENSION.length);
}

// Switch user handler with Thundra handler
process.env[ORIGINAL_HANDLER_ENV_VAR_NAME] = thundraHandler + '.wrapper';
process.env[THUNDRA_HANDLER_ENV_VAR_NAME] = userHandler;