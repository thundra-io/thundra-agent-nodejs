import ModuleUtils from '../../../../utils/ModuleUtils';
import {
    INTEGRATIONS,
    WRAPPERS,
} from '../../../../Constants';
import ThundraLogger from '../../../../ThundraLogger';

const shimmer = require('shimmer');

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

    const jestRuntime = require('jest-runtime');
    if (jestRuntime) {
        ThundraLogger.debug('<ModuleLoader> Wrapping "jest-runtime.requireModule"');
        shimmer.wrap(jestRuntime.prototype || jestRuntime.default.prototype, 'requireModule', requireModuleWrapper);
    }
};

export const unwrapTestRequireModule = () => {
    const jestRuntime = require('jest-runtime');
    if (jestRuntime) {
        ThundraLogger.debug('<ModuleLoader> Unwrapping "jest-runtime.requireModule"');
        shimmer.unwrap(jestRuntime.prototype || jestRuntime.default.prototype, 'requireModule');
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
