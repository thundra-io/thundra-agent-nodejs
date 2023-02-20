/**
 * Support class for AWS Lambda runtime related stuff.
 */

'use strict';

const path = require('path');
const fs = require('fs');
const semver = require('semver');
import ThundraLogger from '../../ThundraLogger';

class InvalidModule extends Error { }
class InvalidHandler extends Error { }
class BadHandlerFormat extends Error { }
class UserCodeError extends Error { }

const FUNCTION_PATTERN = /^([^.]*)\.(.*)$/;
const UPPER_FOLDER_SUBSTRING = '..';

/**
 * Loads handler by given handler {@param handlerString}
 * from given path {@param appPath}
 * @param {string} appPath the application path
 * @param {string} handlerString the handler name including its module name
 * @return the loaded user handler
 */
export function loadHandler(appPath: string, handlerString: string) {
    ThundraLogger.debug(`<LambdaRuntimeSupport> Looading user handler ${handlerString} from ${appPath} ...`);

    if (handlerString.includes(UPPER_FOLDER_SUBSTRING)) {
        throw new BadHandlerFormat(
            `'${handlerString}' is not a valid handler name. Try to use absolute paths.`,
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

    const handlerPath = match[2];
    let module = match[1];
    if (semver.satisfies(process.version, '12.x') || semver.satisfies(process.version, '14.x')) {
        if (module && !(module.startsWith('./') || module.startsWith('../'))) {
            module = './' + module;
        }
    }

    let userModule;
    let handlerFunc;

    try {
        const lambdaStylePath: string = path.resolve(appPath, modulePath, module);
        if (fs.existsSync(modulePath) || fs.existsSync(modulePath + '.js')) {
            userModule = require(lambdaStylePath);
        } else {
            const nodeStylePath = require.resolve(module, {
                paths: [appPath, modulePath],
            });
            userModule = require(nodeStylePath);
        }
    } catch (e) {
        if (e instanceof SyntaxError) {
            throw new UserCodeError(e.toString());
        } else if (e.code !== undefined && e.code === 'MODULE_NOT_FOUND') {
            try {
                // Add relative path prefix to try resolve again for nodejs12.x
                // https://github.com/nodejs/node/issues/27583
                const nodeStylePath = require.resolve('./' + module, {
                    paths: [appPath, modulePath],
                });
                userModule = require(nodeStylePath);
            } catch (err) {
                throw new InvalidModule(e.toString());
            }
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

    ThundraLogger.debug(`<LambdaRuntimeSupport> Looaded user handler ${handlerString} from ${appPath}`);

    return handlerFunc;
}
