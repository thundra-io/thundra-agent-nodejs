/**
 * Loads user handler
 */

const path = require('path');
const fs = require('fs');

class InvalidModule extends Error { }
class InvalidHandler extends Error { }
class BadHandlerFormat extends Error { }
class UserCodeError extends Error { }

const FUNCTION_PATTERN = /^([^.]*)\.(.*)$/;
const UPPER_FOLDER_SUBSTRING = '..';

function _moduleRootAndHandler(fullHandlerString) {
    let handlerString = path.basename(fullHandlerString);
    let moduleRoot = fullHandlerString.substring(0, fullHandlerString.indexOf(handlerString));
    return [moduleRoot, handlerString];
}

function _splitHandlerString(handler) {
    let match = handler.match(FUNCTION_PATTERN);
    if (!match || match.length !== 3) {
        throw new BadHandlerFormat('Bad handler');
    }
    return [match[1], match[2]];
}

function _resolveHandler(object, nestedProperty) {
    return nestedProperty.split('.').reduce((nested, key) => {
        return nested && nested[key];
    }, object);
}

function _tryRequireFile(file, extension = null) {
    let filePath = file + (extension || '');
    if (fs.existsSync(filePath)) {
        return require(filePath);
    }
    return null;
}

async function _tryAwaitImport(file, extension = null) {
    let filePath = file + (extension || '');
    if (fs.existsSync(filePath)) {
        return await import(filePath);
    }
    return null;
}

function _hasFolderPackageJsonTypeModule(folder) {
    if (folder.endsWith('/node_modules')) {
        return false;
    }
    let pj = path.join(folder, '/package.json');
    if (fs.existsSync(pj)) {
        try {
            let pkg = JSON.parse(fs.readFileSync(pj).toString());
            if (pkg) {
                if (pkg.type === 'module') {
                    return true;
                } else {
                    return false;
                }
            }
        } catch (e) {
            console.warn(
                '[THUNDRA]', 'WARN', '-', new Date().toISOString(), '|',
                `${pj} cannot be read, it will be ignored for ES module detection purposes.`, e);
            return false;
        }
    }
    if (folder === '/') {
        return false;
    }
    return _hasFolderPackageJsonTypeModule(path.resolve(folder, UPPER_FOLDER_SUBSTRING));
}

function _hasPackageJsonTypeModule(file) {
    let jsPath = file + '.js';
    if (fs.existsSync(jsPath)) {
        return _hasFolderPackageJsonTypeModule(path.resolve(path.dirname(jsPath)));
    }
    return false;
}

async function _tryRequire(appRoot, moduleRoot, module) {
    let lambdaStylePath = path.resolve(appRoot, moduleRoot, module);
    let extensionless = _tryRequireFile(lambdaStylePath);
    if (extensionless) {
        return extensionless;
    }
    let pjHasModule = _hasPackageJsonTypeModule(lambdaStylePath);
    let loaded = null;
    if (!pjHasModule) {
        loaded = _tryRequireFile(lambdaStylePath, '.js');
        if (loaded) {
            return loaded;
        }
    }
    loaded =
        pjHasModule && await _tryAwaitImport(lambdaStylePath, '.js') ||
        await _tryAwaitImport(lambdaStylePath, '.mjs') ||
        _tryRequireFile(lambdaStylePath, '.cjs');
    if (loaded) {
        return loaded;
    }
    let nodeStylePath = require.resolve(module, {
        paths: [appRoot, moduleRoot],
    });
    return require(nodeStylePath);
}

async function _loadUserApp(appRoot, moduleRoot, module) {
    try {
        return await _tryRequire(appRoot, moduleRoot, module);
    } catch (e) {
        if (e instanceof SyntaxError) {
            throw new UserCodeError(e.toString());
        } else if (e.code !== void 0 && e.code === 'MODULE_NOT_FOUND') {
            throw new InvalidModule(e.toString());
        } else {
            throw e;
        }
    }
}

function _throwIfInvalidHandler(fullHandlerString) {
    if (fullHandlerString.includes(UPPER_FOLDER_SUBSTRING)) {
        throw new InvalidHandler(
            `'${fullHandlerString}' is not a valid handler name. ` + `
            Use absolute paths when specifying root directories in handler names.`);
    }
}

/**
 * Loads handler by given handler {@param fullHandlerString}
 * from given path {@param appRoot}
 * @param {string} appRoot the application root path
 * @param {string} fullHandlerString the handler name including its module name
 * @return the loaded user handler
 */
module.exports.loadUserHandler = async function(appRoot, fullHandlerString) {
    _throwIfInvalidHandler(fullHandlerString);
    let [moduleRoot, moduleAndHandler] = _moduleRootAndHandler(fullHandlerString);
    let [module2, handlerPath] = _splitHandlerString(moduleAndHandler);
    let userApp = await _loadUserApp(appRoot, moduleRoot, module2);
    let handlerFunc = _resolveHandler(userApp, handlerPath);
    if (!handlerFunc) {
        throw new InvalidHandler(`${fullHandlerString} is undefined or not exported`);
    }
    if (typeof handlerFunc !== 'function') {
        throw new InvalidHandler(`${fullHandlerString} is not a function`);
    }
    return handlerFunc;
};
