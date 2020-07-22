import ConfigProvider from '../../dist/config/ConfigProvider';

beforeEach(() => {
    ConfigProvider.clear();
});

afterEach(() => {
    ConfigProvider.clear();
});

test('configuration should be able to passed through environment variables', () => {
    try {
        process.env['THUNDRA_AGENT_MY_KEY'] = 'my-value';
        process.env['THUNDRA_AGENT_LAMBDA_MY_KEY2'] = 'my-value2';
        try {
            ConfigProvider.init();
        } finally {
            delete process.env['THUNDRA_AGENT_MY_KEY'];
            delete process.env['THUNDRA_AGENT_LAMBDA_MY_LAMBDA_KEY'];
        }

        expect(ConfigProvider.get('thundra.agent.my.key')).toEqual('my-value');
        // Upper cases are lowered
        expect(ConfigProvider.get('THUNDRA.AGENT.MY.KEY')).toBeUndefined();
        // Underscores ('_') are replaced with dots ('.')
        expect(ConfigProvider.get('thundra_agent_my_key')).toBeUndefined();
        // Underscores ('_') are replaced with dots ('.') and upper cases are lowered
        expect(ConfigProvider.get('THUNDRA_AGENT_MY_KEY')).toBeUndefined();
        // Non-existing config name
        expect(ConfigProvider.get('THUNDRA_AGENT_MY_KEY2')).toBeUndefined();
        // Added non-lambda alias
        expect(ConfigProvider.get('thundra.agent.my.key2')).toEqual('my-value2');
    } finally {
        ConfigProvider.clear();
    }
});


test('configuration should be able to passed through options', () => {
    try {
        const options = {
            config: {
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
            }
        };
        ConfigProvider.init(options);

        // 'thundra.agent' prefix is added automatically
        expect(ConfigProvider.get('thundra.agent.my.key')).toEqual('my-value');
        // 'thundra.agent' prefix is added automatically
        expect(ConfigProvider.get('thundra.agent.lambda.my.key2')).toEqual('my-value2');
        expect(ConfigProvider.get('thundra.agent.my.key3')).toEqual('my-value3');
        expect(ConfigProvider.get('thundra.agent.lambda.my.key4')).toEqual('my-value4');
        // Non-existing config name
        expect(ConfigProvider.get('thundra.agent.my.key5')).toBeUndefined();
        // Added non-lambda alias
        expect(ConfigProvider.get('thundra.agent.my.key2')).toEqual('my-value2');
        // Added non-lambda alias
        expect(ConfigProvider.get('thundra.agent.my.key4')).toEqual('my-value4');
    } finally {
        ConfigProvider.clear();
    }
});

test('configuration should be able to passed through config file', () => {
    try {
        ConfigProvider.init({ configFilePath: __dirname + '/sample-config.json' });

        // 'thundra.agent' prefix is added automatically
        expect(ConfigProvider.get('thundra.agent.my.key')).toEqual('my-value');
        // 'thundra.agent' prefix is added automatically
        expect(ConfigProvider.get('thundra.agent.lambda.my.key2')).toEqual('my-value2');
        expect(ConfigProvider.get('thundra.agent.my.key3')).toEqual('my-value3');
        expect(ConfigProvider.get('thundra.agent.lambda.my.key4')).toEqual('my-value4');
        // Non-existing config name
        expect(ConfigProvider.get('thundra.agent.my.key5')).toBeUndefined();
        // Added non-lambda alias
        expect(ConfigProvider.get('thundra.agent.my.key2')).toEqual('my-value2');
        // Added non-lambda alias
        expect(ConfigProvider.get('thundra.agent.my.key4')).toEqual('my-value4');
    } finally {
        ConfigProvider.clear();
    }
});

test('configuration should be returned in the type that given in the metadata', () => {
    try {
        process.env['thundra_agent_lambda_debugger_port'] = '3000';
        process.env['thundra_agent_trace_integrations_aws_dynamodb_traceInjection_enable'] = 'true';
        const options = {
            config: {
                thundra: {
                    agent: {
                        application: {
                            className: 'TEST'
                        },
                        debug: {
                            enable: true
                        }
                    }
                }
            }
        };
        try {
            ConfigProvider.init(options);
        } finally {
            delete process.env['thundra_agent_lambda_debugger_port'];
            delete process.env['thundra.agent.trace.integrations.aws.dynamodb.traceInjection.enable'];
        }

        expect(ConfigProvider.get('thundra.agent.lambda.debugger.port')).toEqual(3000);
        expect(ConfigProvider.get('thundra.agent.trace.integrations.aws.dynamodb.traceinjection.enable')).toEqual(true);
        expect(ConfigProvider.get('thundra.agent.application.classname')).toEqual('TEST');
        expect(ConfigProvider.get('thundra.agent.debug.enable')).toEqual(true);
    } finally {
        ConfigProvider.clear();
    }
});

test('configuration should return the default value if provided in the metadata or as an argument', () => {
    try {
        try {
            ConfigProvider.init();
        } finally {
        }

        expect(ConfigProvider.get('thundra.agent.lambda.debugger.enable')).toEqual(false);
        expect(ConfigProvider.get('thundra.agent.lambda.debugger.enable', true)).toEqual(true);
        expect(ConfigProvider.get('thundra.agent.lambda.debugger.logs.enable')).toEqual(false);
    } finally {
        ConfigProvider.clear();
    }
});
