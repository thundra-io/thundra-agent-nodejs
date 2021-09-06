import ModuleUtils from '../../../../utils/ModuleUtils';
import {INTEGRATIONS} from '../../../../Constants';
import ThundraLogger from '../../../../ThundraLogger';

/**
 * try to load test modules
 * @param testRequire testRequire testsuite's context require
 */
const LoadTestModules = (testRequire: any) => {
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

export default LoadTestModules;
