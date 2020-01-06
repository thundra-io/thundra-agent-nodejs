'use strict';

import RuntimeSupport from './runtime/RuntimeSupport';

const HANDLER_ENV_VAR = 'thundra_agent_lambda_handler';

const userHandler = RuntimeSupport.loadHandler(
  process.env.LAMBDA_TASK_ROOT,
  process.env[HANDLER_ENV_VAR],
);

const thundra = require('@thundra/core')();

exports.wrapper = (event: any, context: any, callback: any) => {
  return thundra(userHandler)(event, context, callback);
};
