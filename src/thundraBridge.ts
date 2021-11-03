const THUNDRA_DEV_ENV_VAR = 'THUNDRA_DEV';

module.exports =
    process.env[THUNDRA_DEV_ENV_VAR] === 'true'
        ? require('./index')
        : require('@thundra/core');
