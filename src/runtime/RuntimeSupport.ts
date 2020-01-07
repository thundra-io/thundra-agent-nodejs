'use strict';

const path = require('path');
const fs = require('fs');

class InvalidModule extends Error {}
class InvalidHandler extends Error {}
class BadHandlerFormat extends Error {}
class UserCodeError extends Error {}

const FUNCTION_PATTERN = /^([^.]*)\.(.*)$/;
const UPPER_FOLDER_SUBSTRING = '..';

export function loadHandler(appPath: string, handlerString: string) {
  if (handlerString.includes(UPPER_FOLDER_SUBSTRING)) {
    throw new BadHandlerFormat(
      `'${handlerString}' is not a valid handler name. Use absolute paths when specifying root directories in handler names.`,
    );
  }

  const moduleAndHandler: string = path.basename(handlerString);
  const modulePath: string = handlerString.substring(
    0,
    handlerString.indexOf(moduleAndHandler),
  );

  const match = moduleAndHandler.match(FUNCTION_PATTERN);
  if (!match || match.length !== 3) {
    throw new BadHandlerFormat('Bad handler');
  }
  const [module, handlerPath] = [match[1], match[2]];

  let userModule;
  let handlerFunc;

  try {
    const lambdaStylePath: string = path.resolve(appPath, modulePath, module);
    if (fs.existsSync(modulePath) || fs.existsSync(modulePath + '.js')) {
      userModule = require(lambdaStylePath);
    } else {
      const nodeStylePath: string = require.resolve(module, {
        paths: [appPath, modulePath],
      });
      userModule = require(nodeStylePath);
    }
  } catch (e) {
    if (e instanceof SyntaxError) {
      throw new UserCodeError(e.toString());
    } else if (e.code !== undefined && e.code === 'MODULE_NOT_FOUND') {
      throw new InvalidModule(e.toString());
    } else {
      throw e;
    }
  }

  handlerFunc = handlerPath.split('.').reduce((nested: any, key: any) => {
    return nested && nested[key];
  }, userModule);

  if (!handlerFunc) {
    throw new InvalidHandler(
      `Couldn't find ${handlerString}, it might be undefined or not exported`,
    );
  }

  if (typeof handlerFunc !== 'function') {
    throw new InvalidHandler(`Type of ${handlerString} is not a function`);
  }

  return handlerFunc;
}
