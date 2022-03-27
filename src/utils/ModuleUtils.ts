import ThundraLogger from '../ThundraLogger';
import ModuleVersionValidator from './ModuleVersionValidator';
import Utils from '../utils/Utils';
import { EnvVariableKeys } from '../Constants';

const Hook = require('require-in-the-middle');
const shimmer = require('shimmer');
const path = require('path');
const parse = require('module-details-from-path');

declare var __non_webpack_require__: any;
const customReq = typeof __non_webpack_require__ !== 'undefined'
    ? __non_webpack_require__
    : require;
const thundraWrapped = '__thundra_wrapped';

/**
 * Common/global utilities for module related stuff
 */
class ModuleUtils {

    private static readonly instrumenters: any = [];
    private static readonly pendingModulesToInstrument: any = [];
    private static instrumentOnLoad: boolean = true;

    private constructor() {
    }

    /**
     * Gets the load time instrumentation mode flag
     * @return the load time instrumentation mode flag
     */
    static isInstrumentOnLoad(): boolean {
        return ModuleUtils.instrumentOnLoad;
    }

    /**
     * Sets the load time instrumentation mode flag
     * @param instrumentOnLoad the load time instrumentation mode flag to be set
     */
    static setInstrumentOnLoad(instrumentOnLoad: boolean): void {
        ModuleUtils.instrumentOnLoad = instrumentOnLoad;
    }

    /**
     * Tries to require given module by its name and paths
     * @param {string} name the module name
     * @param {string[]} paths the paths to be looked for module
     * @return the required module
     */
    static tryRequire(name: string, paths?: string[]): any {
        try {
            let resolvedPath;
            if (paths) {
                resolvedPath = customReq.resolve(name, { paths });
            } else {
                const lambdaTaskRoot = Utils.getEnvVar(EnvVariableKeys.LAMBDA_TASK_ROOT);
                if (lambdaTaskRoot) {
                    resolvedPath = customReq.resolve(name, { paths: [lambdaTaskRoot] });
                } else {
                    resolvedPath = customReq.resolve(name);
                }
            }
            return customReq(resolvedPath);
        } catch (e) {
            ThundraLogger.debug(`<ModuleUtils> Couldn't require module ${name} in the paths ${paths}:`, e.message);
        }
    }

    /**
     * Instruments given module if it is supported
     * @param moduleName {string} name of the module to be instrumented
     * @param module the module to be instrumented
     * @return {boolean} {@code true} if the given has been instrumented,
     *                   {@code false} otherwise
     */
    static instrumentModule(moduleName: string, module: any): boolean {
        ThundraLogger.debug(
            `<ModuleUtils> Looking for registered instrumenter to instrument module ${moduleName} ...`);
        const instrumenter = ModuleUtils.instrumenters[moduleName];
        if (instrumenter) {
            const { libs, wrapper, config } = instrumenter;
            return ModuleUtils.doInstrument(module, libs, null, moduleName, null, wrapper, config);
        } else {
            ThundraLogger.debug(
                `<ModuleUtils> Couldn't find any registered instrumenter for module ${moduleName} to instrument`);
            ModuleUtils.pendingModulesToInstrument[moduleName] = module;
            ThundraLogger.debug(`<ModuleUtils> Registered ${moduleName} as pending module to instrument later`);
        }
        return false;
    }

    /**
     * Uninstruments given module if it is supported and already instrumented
     * @param moduleName {string} name of the module to be uninstrumented
     * @param module the module to be uninstrumented
     * @return {boolean} {@code true} if the given has been uninstrumented,
     *                   {@code false} otherwise
     */
    static uninstrumentModule(moduleName: string, module: any): boolean {
        ThundraLogger.debug(
            `<ModuleUtils> Looking for registered instrumenter to uninstrument module ${moduleName} ...`);
        // Remove module from pending modules in any case
        delete ModuleUtils.pendingModulesToInstrument[moduleName];
        const instrumenter = ModuleUtils.instrumenters[moduleName];
        if (instrumenter) {
            const { libs, unwrapper, config } = instrumenter;
            return ModuleUtils.doUninstrument(module, libs, moduleName, unwrapper, config);
        } else {
            ThundraLogger.debug(
                `<ModuleUtils> Couldn't find any registered instrumenter for module ${moduleName} to uninstrument`);
        }
        return false;
    }

    /**
     * Instruments given module by its name
     * @param {string[]} moduleNames the modules names to instrument
     * @param {string} version the version of the library
     * @param wrapper the wrapper to instrument
     * @param unwrapper the unwrapper to un-instrument
     * @param config the config to be passed to wrapper and unwrapper
     * @param {string[]} paths the paths to be looked for module to instrument
     * @param {string} fileName the name of the file in module to instrument
     * @return the context to manage instrumentation cycle (for ex. un-instrument)
     */
    static instrument(moduleNames: string[], version: string, wrapper: any,
                      unwrapper?: any, config?: any, paths?: string[], fileName?: string): any {
        const libs: any[] = [];
        const hooks: any[] = [];
        // Register for given module names as instrumenter
        moduleNames.forEach((moduleName: string) => {
            ThundraLogger.debug(`<ModuleUtils> Registering instrumenter for module ${moduleName}`);
            ModuleUtils.instrumenters[moduleName] = {
                libs,
                wrapper,
                unwrapper,
                config,
            };
            // Check whether there is any pending module to instrument
            const moduleToInstrument = ModuleUtils.pendingModulesToInstrument[moduleName];
            if (moduleToInstrument) {
                ThundraLogger.debug(
                    `<ModuleUtils> Found pending module ${moduleName} to instrument, so instrumenting it`);
                // Remove module from pending modules
                delete ModuleUtils.pendingModulesToInstrument[moduleName];
                // Instrument pending module
                ModuleUtils.instrumentModule(moduleName, moduleToInstrument);
            }
        });
        for (const moduleName of moduleNames) {
            const requiredLib = ModuleUtils.tryRequire(fileName ? path.join(moduleName, fileName) : moduleName, paths);
            if (requiredLib) {
                if (version) {
                    const moduleInfo = ModuleUtils.getModuleInfo(moduleName);
                    if (!moduleInfo) {
                        ThundraLogger.debug(`<Utils> Base directory is not found for the package ${moduleName}`);
                        return;
                    }
                    ModuleUtils.doInstrument(requiredLib, libs, moduleInfo.basedir, moduleName, version, wrapper, config);
                } else {
                    ModuleUtils.doInstrument(requiredLib, libs, null, moduleName, null, wrapper, config);
                }
            }
            if (ModuleUtils.instrumentOnLoad) {
                const hook = Hook(moduleName, {internals: true}, (lib: any, name: string, basedir: string) => {
                    if (name === moduleName) {
                        ModuleUtils.doInstrument(lib, libs, basedir, moduleName, version, wrapper, config);
                    }
                    return lib;
                });
                hooks.push(hook);
            }
        }
        return {
            uninstrument: () => {
                for (const lib of libs) {
                    if (unwrapper) {
                        unwrapper(lib, config);
                    }
                    delete lib[thundraWrapped];
                }
                for (const hook of hooks) {
                    hook.unhook();
                }
            },
        };
    }

    /**
     * Patches the given method of the specified module by wrapper.
     * @param {string} moduleName name of the module to be patched
     * @param {string} methodName name of the method to be patched
     * @param {Function} wrapper to wrap the actual patched method
     * @param {Function} extractor extracts the member (for ex. exported module/class)
     *                   from given module to patch
     */
    static patchModule(moduleName: string, methodName: string,
                       wrapper: Function, extractor: Function = (mod: any) => mod, module?: any): boolean {
        ThundraLogger.debug(`<ModuleUtils> Patching module ${moduleName}`);

        if (module) {
            shimmer.wrap(extractor(module), methodName, wrapper);
            ThundraLogger.debug(`<ModuleUtils> Patched module ${moduleName}`);
            return true;
        } else {

            const requiredModule = ModuleUtils.tryRequire(moduleName);
            if (requiredModule) {
                shimmer.wrap(extractor(requiredModule), methodName, wrapper);
                ThundraLogger.debug(`<ModuleUtils> Patched module ${moduleName}`);
                return true;
            }

            ThundraLogger.debug(`<ModuleUtils> Couldn't find module ${moduleName} to patch`);
            return false;
        }
    }

    private static getModuleInfo(name: string, paths?: string[]): any {
        try {
            let modulePath;
            if (paths) {
                modulePath = customReq.resolve(name, { paths });
            } else {
                const lambdaTaskRoot = Utils.getEnvVar(EnvVariableKeys.LAMBDA_TASK_ROOT);
                if (lambdaTaskRoot) {
                    modulePath = customReq.resolve(name, { paths: [lambdaTaskRoot] });
                } else {
                    modulePath = customReq.resolve(name);
                }
            }
            return parse(modulePath);
        } catch (e) {
            ThundraLogger.debug(`<ModuleUtils> Couldn't get info of module ${name} in the paths ${paths}:`, e.message);
            return {};
        }
    }

    private static doInstrument(lib: any, libs: any[], basedir: string, moduleName: string,
                                version: string, wrapper: any, config?: any): boolean {
        ThundraLogger.debug(`<ModuleUtils> Instrumenting module ${moduleName} ...`);
        let isValid = false;
        if (version) {
            const isValidVersion = ModuleVersionValidator.validateModuleVersion(basedir, version);
            if (!isValidVersion) {
                ThundraLogger.debug(
                    `<ModuleUtils> Invalid module version for ${moduleName} integration. Supported version is ${version}`);
            } else {
                isValid = true;
            }
        } else {
            isValid = true;
        }
        if (isValid) {
            if (!lib[thundraWrapped]) {
                wrapper(lib, config, moduleName);
                lib[thundraWrapped] = true;
                libs.push(lib);
                ThundraLogger.debug(`<ModuleUtils> Instrumented module ${moduleName}`);
                return true;
            } else {
                ThundraLogger.debug(
                    `<ModuleUtils> Couldn't instrument module ${moduleName} as it is already instrumented`);
            }
        } else {
            ThundraLogger.debug(
                `<ModuleUtils> Couldn't instrument module ${moduleName} as it is not valid to instrument`);
        }
        return false;
    }

    private static doUninstrument(lib: any, libs: any[], moduleName: string, unwrapper: any, config?: any): boolean {
        ThundraLogger.debug(`<ModuleUtils> Uninstrumenting module ${moduleName} ...`);
        const wrappedByThundra = lib[thundraWrapped];
        if (wrappedByThundra && unwrapper) {
            // Unwrap module
            unwrapper(module, config);
            // Remove module from libs
            for (let i = libs.length - 1; i >= 0; i--) {
                if (libs[i] === module) {
                    libs.splice(i, 1);
                }
            }
            // Remove Thundra wrapper flag from module
            delete lib[thundraWrapped];
            ThundraLogger.debug(`<ModuleUtils> Uninstrumented module ${moduleName}`);
            return true;
        } else {
            if (!wrappedByThundra) {
                ThundraLogger.debug(
                    `<ModuleUtils> Couldn't uninstrument module ${moduleName} as it is not instrumented yet`);
            } else {
                ThundraLogger.debug(
                    `<ModuleUtils> Couldn't uninstrument module ${moduleName} as no unwrapper could be found`);
            }
            return false;
        }
    }

}

export default ModuleUtils;
