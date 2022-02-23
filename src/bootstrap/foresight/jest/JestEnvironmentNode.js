require('../index');

const { ModuleUtils } = require('../../../thundraInternalApi');

module.exports = ModuleUtils.tryRequire('jest-environment-node');
