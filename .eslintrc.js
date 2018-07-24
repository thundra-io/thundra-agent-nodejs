module.exports = {
    'env': {
        'es6': true,
        'node': true,
        'jest': true
    },
    'extends': 'eslint:recommended',
    'parserOptions': {
        'sourceType': 'module'
    },
    'parser' : 'babel-eslint',
    'rules': {
        'indent': ['error', 4],
        'linebreak-style': ['error', 'unix'],
        'quotes': ['error', 'single'],
        'semi': ['error', 'always'],
        'no-unused-vars': 0,
        'no-console': ['warn', {allow: ['warn', 'error']}],
    }
};