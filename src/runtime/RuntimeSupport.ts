'use strict';

const path = require('path');
const fs = require('fs');

class ImportModuleError extends Error {}
class HandlerNotFound extends Error {}
class MalformedHandlerName extends Error {}
class UserCodeSyntaxError extends Error {}

const FUNCTION_EXPR = /^([^.]*)\.(.*)$/;
const RELATIVE_PATH_SUBSTRING = '..';

function getModuleDirAndHandler(fullHandlerString: string) {
  const handlerString: string = path.basename(fullHandlerString);
  const moduleRoot: string = fullHandlerString.substring(
    0,
    fullHandlerString.indexOf(handlerString),
  );
  return [moduleRoot, handlerString];
}

function getModuleAndFunction(handler: string) {
  const match = handler.match(FUNCTION_EXPR);
  if (!match || match.length !== 3) {
    throw new MalformedHandlerName('Bad handler');
  }
  return [match[1], match[2]];
}

function getHandler(object: any, nestedProperty: any) {
  return nestedProperty.split('.').reduce((nested: any, key: any) => {
    return nested && nested[key];
  }, object);
}

function requireModule(appPath: string, modulePath: string, module: string) {
  const lambdaStylePath: string = path.resolve(appPath, modulePath, module);
  if (fs.existsSync(modulePath) || fs.existsSync(modulePath + '.js')) {
    return require(lambdaStylePath);
  } else {
    const nodeStylePath: string = require.resolve(module, {
      paths: [appPath, modulePath],
    });
    return require(nodeStylePath);
  }
}

function loadUserModule(appRoot: string, moduleRoot: string, module: string) {
  try {
    return requireModule(appRoot, moduleRoot, module);
  } catch (e) {
    if (e instanceof SyntaxError) {
      throw new UserCodeSyntaxError(e.toString());
    } else if (e.code !== undefined && e.code === 'MODULE_NOT_FOUND') {
      throw new ImportModuleError(e.toString());
    } else {
      throw e;
    }
  }
}

function loadHandler(appPath: string, handlerString: string) {
  if (handlerString.includes(RELATIVE_PATH_SUBSTRING)) {
    throw new MalformedHandlerName(
      `'${handlerString}' is not a valid handler name. Use absolute paths when specifying root directories in handler names.`,
    );
  }

  const [modulePath, moduleAndHandler] = getModuleDirAndHandler(handlerString);
  const [module, handlerPath] = getModuleAndFunction(moduleAndHandler);

  const userModule = loadUserModule(appPath, modulePath, module);
  const handlerFunc = getHandler(userModule, handlerPath);

  if (!handlerFunc) {
    throw new HandlerNotFound(
      `${handlerString} is undefined or not exported`,
    );
  }

  if (typeof handlerFunc !== 'function') {
    throw new HandlerNotFound(`${handlerString} is not a function`);
  }

  return handlerFunc;
}

export default {
  loadHandler,
};
