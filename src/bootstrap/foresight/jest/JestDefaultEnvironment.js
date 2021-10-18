const ModuleUtils = require('@thundra/core/dist/utils/ModuleUtils').default;
const ModuleVersionValidator = require('@thundra/core/dist/utils/ModuleVersionValidator').default;

const jestModuleInfo = ModuleUtils.getModuleInfo('jest');
if (jestModuleInfo) {

    const isDefaultEnvironmentNode = ModuleVersionValidator.validateModuleVersion(jestModuleInfo.basedir, '^27.0.0');

    module.exports = isDefaultEnvironmentNode
        ? require('@thundra/core/dist/bootstrap/foresight/jest/JestEnvironmentNode.js')
        : require('@thundra/core/dist/bootstrap/foresight/jest/JestEnvironmentJsdom.js');
}
