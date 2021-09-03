import ModuleUtils from '../../../../utils/ModuleUtils';
import {INTEGRATIONS} from '../../../../Constants';
import ThundraLogger from '../../../../ThundraLogger';

const LoadTestModules = (testRequire: any) => {
    for (const key in INTEGRATIONS) {
        const integration = INTEGRATIONS[key];
        if (integration) {
            for (const module of integration.moduleNames) {
                try {
                    ModuleUtils.instrumentModule(module, testRequire(module));
                    ThundraLogger.info(`<ModuleLoader> Module instrumented: ${module}`);
                } catch (e) {
                    ThundraLogger.info(`<ModuleLoader> Cannot instrument module: ${module}`);
                }
            }
        }
    }
};

export default LoadTestModules;
