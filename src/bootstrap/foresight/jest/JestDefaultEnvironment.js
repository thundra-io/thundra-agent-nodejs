const { ModuleUtils } = require('../../../thundraInternalApi');
const { ModuleVersionValidator } = require('../../../thundraInternalApi');

const jestModuleInfo = ModuleUtils.getModuleInfo('jest');
if (jestModuleInfo) {
    const isDefaultEnvironmentNode =
        ModuleVersionValidator.validateModuleVersion(jestModuleInfo.basedir, '^27.0.0');

    module.exports = isDefaultEnvironmentNode
        ? require('./JestEnvironmentNode.js')
        : require('./JestEnvironmentJsdom.js');
}
