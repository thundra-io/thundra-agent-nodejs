'use strict';

import { loadHandler } from './runtime/RuntimeSupport';

const HANDLER_ENV_VAR = 'thundra_agent_lambda_handler';

const thundra = require('@thundra/core')();
const userHandler = loadHandler(
  process.env.LAMBDA_TASK_ROOT,
  process.env[HANDLER_ENV_VAR],
);

const wrappedUserFunc = thundra(userHandler);

exports.wrapper = (event: any, context: any, callback: any) => {
  return wrappedUserFunc(event, context, callback);
};
