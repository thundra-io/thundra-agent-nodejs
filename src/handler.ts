'use strict';

import { loadHandler } from './runtime/RuntimeSupport';
import Utils from './plugins/utils/Utils';
import { EnvVariableKeys } from './Constants';

const HANDLER_ENV_VAR = 'thundra_agent_lambda_handler';

const thundra = require('@thundra/core')();
const userHandler = loadHandler(
  Utils.getEnvVar(EnvVariableKeys.LAMBDA_TASK_ROOT),
  Utils.getEnvVar(HANDLER_ENV_VAR),
);

const wrappedUserFunc = thundra(userHandler);

exports.wrapper = (event: any, context: any, callback: any) => {
  return wrappedUserFunc(event, context, callback);
};
