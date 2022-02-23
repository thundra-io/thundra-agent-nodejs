import ModuleUtils from '../../../../utils/ModuleUtils';
import {
    INTEGRATIONS,
    WRAPPERS,
} from '../../../../Constants';
import ThundraLogger from '../../../../ThundraLogger';
import Trace from '../../../../plugins/Trace';

const shimmer = require('shimmer');
const has = require('lodash.has');

let TransformWrapped = false;

export const isTransformWrapped = (): boolean => {
    return TransformWrapped;
};

export const setTransformWrapped = (transformWrapped: boolean) => {
    TransformWrapped = transformWrapped;
};

/**
 * try to load test modules
 * @param testRequire testRequire testsuite's context require
 */
export const loadTestModules = (testRequire: any) => {
    loadIntegrations(testRequire);
    loadWrappers(testRequire);
};

export const wrapTestRequireModule = () => {
    function requireModuleWrapper(internalRequireModule: any) {
        return function internalRequireModuleWrapper(from: any, moduleName: any, options: any, isRequireActual: any) {
            if (moduleName === '@thundra/core'
              && global && global.__thundraMasterModule__
              && global.__thundraMasterModule__.moduleExports) {
                ThundraLogger.debug('<ModuleLoader> "@thundra/core" returned from global.');
                return global.__thundraMasterModule__.moduleExports;
            }
            return internalRequireModule.call(this, from, moduleName, options, isRequireActual);
        };
    }

    const jestRuntime = ModuleUtils.tryRequire('jest-runtime');
    if (jestRuntime) {
        if (has(jestRuntime, 'prototype.requireModule')) {
            ThundraLogger.debug('<ModuleLoader> Wrapping "jest-runtime.requireModule"');
            shimmer.wrap(jestRuntime.prototype, 'requireModule', requireModuleWrapper);
        } else if (has(jestRuntime, 'default.prototype.requireModule')) {
            ThundraLogger.debug('<ModuleLoader> Wrapping "jest-runtime.requireModule"');
            shimmer.wrap(jestRuntime.default.prototype, 'requireModule', requireModuleWrapper);
        }
    }
};

export const unwrapTestRequireModule = () => {
    const jestRuntime = ModuleUtils.tryRequire('jest-runtime');
    if (jestRuntime) {
        if (has(jestRuntime, 'prototype.requireModule')) {
            ThundraLogger.debug('<ModuleLoader> Unwrapping "jest-runtime.requireModule"');
            shimmer.unwrap(jestRuntime.prototype, 'requireModule');
        } else if (has(jestRuntime, 'default.prototype.requireModule')) {
            ThundraLogger.debug('<ModuleLoader> Unwrapping "jest-runtime.requireModule"');
            shimmer.unwrap(jestRuntime.default.prototype, 'requireModule');
        }
    }
};

export const wrapTestTransformFile = (tracePlugin: Trace) => {
    function transformFileWrapper(internalTransformFile: any) {
        TransformWrapped = true;
        return function internalTransformFileWrapper(fileName: string, options?: any) {
            let code: string = internalTransformFile.call(this, fileName, options);
            if (code) {
                code = tracePlugin.instrument(fileName, code);
            }
            return code;
        };
    }

    const jestRuntime = ModuleUtils.tryRequire('jest-runtime');
    if (jestRuntime) {
        if (has(jestRuntime, 'prototype.transformFile')) {
            ThundraLogger.debug('<ModuleLoader> Wrapping "jest-runtime.transformFile"');
            shimmer.wrap(jestRuntime.prototype, 'transformFile', transformFileWrapper);
        } else if (has(jestRuntime, 'default.prototype.transformFile')) {
            ThundraLogger.debug('<ModuleLoader> Wrapping "jest-runtime.transformFile"');
            shimmer.wrap(jestRuntime.default.prototype, 'transformFile', transformFileWrapper);
        }
    }
};

export const unwrapTestTransformFile = () => {
    const jestRuntime = ModuleUtils.tryRequire('jest-runtime');
    if (jestRuntime) {
        if (has(jestRuntime, 'prototype.transformFile')) {
            ThundraLogger.debug('<ModuleLoader> Unwrapping "jest-runtime.transformFile"');
            shimmer.unwrap(jestRuntime.prototype, 'transformFile');
        } else if (has(jestRuntime, 'default.prototype.transformFile')) {
            ThundraLogger.debug('<ModuleLoader> Unwrapping "jest-runtime.transformFile"');
            shimmer.unwrap(jestRuntime.default.prototype, 'transformFile');
        }
    }
};

export const wrapTestTransformFileAsync = (tracePlugin: Trace) => {
    function transformFileAsyncWrapper(internalTransformFileAsync: any) {
        TransformWrapped = true;
        return function internalTransformFileAsyncWrapper(fileName: string, options?: any) {
            const codePromise: Promise<string> = internalTransformFileAsync.call(this, fileName, options);
            if (codePromise) {
                return new Promise<string>((res: Function, rej: Function) => {
                    codePromise.
                        then((code: string) => {
                            if (code) {
                                code = tracePlugin.instrument(fileName, code);
                            }
                            res(code);
                        }).
                        catch((err: Error) => {
                            rej(err);
                        });
                });
            }
            return codePromise;
        };
    }

    const jestRuntime = ModuleUtils.tryRequire('jest-runtime');
    if (jestRuntime) {
        if (has(jestRuntime, 'prototype.transformFileAsync')) {
            ThundraLogger.debug('<ModuleLoader> Wrapping "jest-runtime.transformFileAsync"');
            shimmer.wrap(jestRuntime.prototype, 'transformFileAsync', transformFileAsyncWrapper);
        } else if (has(jestRuntime, 'default.prototype.transformFileAsync')) {
            ThundraLogger.debug('<ModuleLoader> Wrapping "jest-runtime.transformFileAsync"');
            shimmer.wrap(jestRuntime.default.prototype, 'transformFileAsync', transformFileAsyncWrapper);
        }
    }
};

export const unwrapTestTransformFileAsync = () => {
    const jestRuntime = ModuleUtils.tryRequire('jest-runtime');
    if (jestRuntime) {
        if (has(jestRuntime, 'prototype.transformFileAsync')) {
            ThundraLogger.debug('<ModuleLoader> Unwrapping "jest-runtime.transformFileAsync"');
            shimmer.unwrap(jestRuntime.prototype, 'transformFileAsync');
        } else if (has(jestRuntime, 'default.prototype.transformFileAsync')) {
            ThundraLogger.debug('<ModuleLoader> Unwrapping "jest-runtime.transformFileAsync"');
            shimmer.unwrap(jestRuntime.default.prototype, 'transformFileAsync');
        }
    }
};

const loadIntegrations = (testRequire: any) => {
    for (const key in INTEGRATIONS) {
        const integration = INTEGRATIONS[key];
        if (integration) {
            for (const module of integration.moduleNames) {
                try {
                    ModuleUtils.instrumentModule(module, testRequire(module));
                    ThundraLogger.debug(`<ModuleLoader> Module instrumented: ${module}`);
                } catch (e) {
                    ThundraLogger.debug(`<ModuleLoader> Cannot instrument module: ${module}`);
                }
            }
        }
    }
};

const loadWrappers = (testRequire: any) => {
    for (const key in WRAPPERS) {
        const wrapper = WRAPPERS[key];
        if (wrapper) {
            for (const module of wrapper.moduleNames) {
                try {
                    ModuleUtils.instrumentModule(module, testRequire(module));
                    ThundraLogger.debug(`<ModuleLoader> Module instrumented: ${module}`);
                } catch (e) {
                    ThundraLogger.debug(`<ModuleLoader> Cannot instrument module: ${module}`);
                }
            }
        }
    }
};
