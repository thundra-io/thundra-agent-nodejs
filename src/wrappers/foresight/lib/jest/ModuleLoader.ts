import ModuleUtils from '../../../../utils/ModuleUtils';

const LoadTestModules = (testRequire: any) => {

    /**
     * todo: take integration modules list
     * and call instrumentModule method for all integration modules
     */

    ModuleUtils.instrumentModule('aws-sdk', testRequire('aws-sdk'));
    ModuleUtils.instrumentModule('aws-sdk/lib/core.js', testRequire('aws-sdk/lib/core.js'));
    ModuleUtils.instrumentModule('redis', testRequire('redis'));
};

export default LoadTestModules;
