const ORIGINAL_HANDLER_ENV_VAR_NAME = '_HANDLER';
const LAMBDA_TASK_ROOT_ENV_VAR_NAME = 'LAMBDA_TASK_ROOT';
const THUNDRA_HANDLER_ENV_VAR_NAME = 'THUNDRA_AGENT_LAMBDA_HANDLER';
const THUNDRA_MODULE_ROOT_DIR = '@thundra/core/dist';
const JS_FILE_EXTENSIONS = ['.js', '.cjs', '.mjs'];

function _getUserHandler() {
    return process.env[ORIGINAL_HANDLER_ENV_VAR_NAME];
}

function _getThundraHandler() {
    const nodeVersion = parseInt(process.version.trim().replace(/^[=v]+/, ''));
    const esSupportEnable = nodeVersion >= 14 && process.env.THUNDRA_AGENT_LAMBDA_ES_ENABLE === 'true';
    const handlerPath = esSupportEnable ? './handler_es.mjs' : `${THUNDRA_MODULE_ROOT_DIR}/handler.js`;
    const lambdaTaskRoot = process.env[LAMBDA_TASK_ROOT_ENV_VAR_NAME];

    let handler = require.resolve(handlerPath);

    if (handler.startsWith(lambdaTaskRoot)) {
        handler = '.' + handler.substring(lambdaTaskRoot.length);
    }

    for (let ext of JS_FILE_EXTENSIONS) {
        if (handler.endsWith(ext)) {
            handler = handler.substring(0, handler.length - ext.length);
            break;
        }
    }

    return handler;
}

// Get user handler
const userHandler = _getUserHandler();
// Get Thundra handler
const thundraHandler = _getThundraHandler();

// Switch user handler and Thundra handler
process.env[ORIGINAL_HANDLER_ENV_VAR_NAME] = thundraHandler + '.wrapper';
process.env[THUNDRA_HANDLER_ENV_VAR_NAME] = userHandler;
