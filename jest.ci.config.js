const baseConfig = require('./jest.config');

module.exports = {
    ...baseConfig,
    'testMatch': [
        '<rootDir>/test/*.test.js',
        '<rootDir>/test/plugins/*.js',
        '<rootDir>/test/opentracing/*.js',
        '<rootDir>/test/integration/*.js'
    ],
    'transform': {
        '.+\\.(js|jsx|ts|tsx)$': 'babel-jest'
    },
    'moduleFileExtensions': [
        'js'
    ],
    'collectCoverageFrom': [
        'dist/*.js',
        'dist/opentracing/*.js',
        'dist/opentracing/instrument/*.js',
        'dist/opentracing/sampler/*.js',
        'dist/plugins/*.js',
        'dist/plugins/data/base/*.js',
        'dist/plugins/data/invocation/*.js',
        'dist/plugins/data/metric/*.js',
        'dist/plugins/config/*.js',
        'dist/plugins/data/trace/*.js',
        'dist/plugins/error/*.js',
        'dist/plugins/listeners/*.js',
        'dist/plugins/support/*.js',
        'index.js',
        'dist/plugins/integrations/*.js'
    ],
};
