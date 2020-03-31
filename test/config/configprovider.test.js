import ConfigProvider from '../../dist/config/ConfigProvider';

beforeEach(() => {
    ConfigProvider.clear();
});

afterEach(() => {
    ConfigProvider.clear();
});

test('Configuration should be able to passed through environment variables', () => {
    try {
        process.env['THUNDRA_AGENT_MY_KEY'] = 'my-value';
        process.env['THUNDRA_AGENT_LAMBDA_MY_KEY2'] = 'my-value2';
        try {
            ConfigProvider.init();
        } finally {
            delete process.env['THUNDRA_AGENT_MY_KEY'];
            delete process.env['THUNDRA_AGENT_LAMBDA_MY_LAMBDA_KEY'];
        }

        expect(ConfigProvider.getConfiguration('thundra.agent.my.key')).toEqual('my-value');
        // Upper cases are lowered
        expect(ConfigProvider.getConfiguration('THUNDRA.AGENT.MY.KEY')).toBeUndefined();
        // Underscores ('_') are replaced with dots ('.')
        expect(ConfigProvider.getConfiguration('thundra_agent_my_key')).toBeUndefined();
        // Underscores ('_') are replaced with dots ('.') and upper cases are lowered
        expect(ConfigProvider.getConfiguration('THUNDRA_AGENT_MY_KEY')).toBeUndefined();
        // Non-existing config name
        expect(ConfigProvider.getConfiguration('THUNDRA_AGENT_MY_KEY2')).toBeUndefined();
        // Added non-lambda alias
        expect(ConfigProvider.getConfiguration('thundra.agent.my.key2')).toEqual('my-value2');
    } finally {
        ConfigProvider.clear();
    }
});


test('Configuration should be able to passed through options', () => {
    try {
        const options = {
            my: {
                key: 'my-value'
            },
            lambda: {
                my: {
                    key2: 'my-value2'
                }
            },
            thundra: {
                agent: {
                    my: {
                        key3: 'my-value3'
                    },
                    lambda: {
                        my: {
                            key4: 'my-value4'
                        }
                    }
                }
            }
        };
        ConfigProvider.init(options);

        // 'thundra.agent' prefix is added automatically
        expect(ConfigProvider.getConfiguration('thundra.agent.my.key')).toEqual('my-value');
        // 'thundra.agent' prefix is added automatically
        expect(ConfigProvider.getConfiguration('thundra.agent.lambda.my.key2')).toEqual('my-value2');
        expect(ConfigProvider.getConfiguration('thundra.agent.my.key3')).toEqual('my-value3');
        expect(ConfigProvider.getConfiguration('thundra.agent.lambda.my.key4')).toEqual('my-value4');
        // Non-existing config name
        expect(ConfigProvider.getConfiguration('thundra.agent.my.key5')).toBeUndefined();
        // Added non-lambda alias
        expect(ConfigProvider.getConfiguration('thundra.agent.my.key2')).toEqual('my-value2');
        // Added non-lambda alias
        expect(ConfigProvider.getConfiguration('thundra.agent.my.key4')).toEqual('my-value4');
    } finally {
        ConfigProvider.clear();
    }
});

test('Configuration should be able to passed through config file', () => {
    try {

        ConfigProvider.init(null, __dirname + '/sample-config.json');

        // 'thundra.agent' prefix is added automatically
        expect(ConfigProvider.getConfiguration('thundra.agent.my.key')).toEqual('my-value');
        // 'thundra.agent' prefix is added automatically
        expect(ConfigProvider.getConfiguration('thundra.agent.lambda.my.key2')).toEqual('my-value2');
        expect(ConfigProvider.getConfiguration('thundra.agent.my.key3')).toEqual('my-value3');
        expect(ConfigProvider.getConfiguration('thundra.agent.lambda.my.key4')).toEqual('my-value4');
        // Non-existing config name
        expect(ConfigProvider.getConfiguration('thundra.agent.my.key5')).toBeUndefined();
        // Added non-lambda alias
        expect(ConfigProvider.getConfiguration('thundra.agent.my.key2')).toEqual('my-value2');
        // Added non-lambda alias
        expect(ConfigProvider.getConfiguration('thundra.agent.my.key4')).toEqual('my-value4');
    } finally {
        ConfigProvider.clear();
    }
});