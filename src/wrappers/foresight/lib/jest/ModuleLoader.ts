import ModuleUtils from '../../../../utils/ModuleUtils';
import {INTEGRATIONS} from '../../../../Constants';

const LoadTestModules = (testRequire: any) => {

    /**
     * todo: take integration modules list
     * and call instrumentModule method for all integration modules
     */

    for (const key in INTEGRATIONS) {
        const integration = INTEGRATIONS[key];
        if (integration) {
            for (const module of integration.moduleNames){
                ModuleUtils.instrumentModule(module, testRequire(module));
            }
        }
    }
    // ModuleUtils.instrumentModule('aws-sdk', testRequire('aws-sdk'));
    // ModuleUtils.instrumentModule('aws-sdk/lib/core.js', testRequire('aws-sdk/lib/core.js'));
    // ModuleUtils.instrumentModule('redis', testRequire('redis'));
};

export default LoadTestModules;
