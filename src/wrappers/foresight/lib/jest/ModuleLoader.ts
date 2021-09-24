import ModuleUtils from '../../../../utils/ModuleUtils';
import {
    INTEGRATIONS,
    WRAPPERS,
} from '../../../../Constants';
import ThundraLogger from '../../../../ThundraLogger';

/**
 * try to load test modules
 * @param testRequire testRequire testsuite's context require
 */
const LoadTestModules = (testRequire: any) => {

    loadIntegrations(testRequire);
    loadWrappers(testRequire);
};

const loadIntegrations = (testRequire: any) => {

    for (const key in INTEGRATIONS) {
        const integration = INTEGRATIONS[key];
        if (integration && !integration.buildInIntegration) {
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

export default LoadTestModules;
