import ThundraConfig from '../../dist/plugins/config/ThundraConfig';
import Utils from '../utils';
import ConfigProvider from '../../dist/config/ConfigProvider';
import ConfigNames from '../../dist/config/ConfigNames';
import TraceConfig  from '../../dist/plugins/config/TraceConfig';

describe('Trace Config Test', () => {
    beforeEach(() => {
        Utils.clearEnvironmentVariables();
        ConfigProvider.clear();
    });

    afterEach(() => {
        Utils.clearEnvironmentVariables();
        ConfigProvider.clear();
    });

    test('with programmatic config',() => {
        const config = new ThundraConfig({
            warmupAware: true,
            traceConfig: {
                disableRequest: true,
                disableResponse: true,
                disableInstrumentation: true
            }
        });

        expect(config.warmupAware).toEqual(true);
        expect(config.traceConfig.disableRequest).toEqual(true);
        expect(config.traceConfig.disableResponse).toEqual(true);
        expect(config.traceConfig.disableInstrumentation).toEqual(true);
    });

    test('with environment variable overrides programmatic with false value',() => {
        process.env[ConfigProvider.configNameToEnvVar(ConfigNames.THUNDRA_LAMBDA_TRACE_REQUEST_SKIP)] = 'false';
        process.env[ConfigProvider.configNameToEnvVar(ConfigNames.THUNDRA_LAMBDA_TRACE_RESPONSE_SKIP)] = 'false';
        process.env[ConfigProvider.configNameToEnvVar(ConfigNames.THUNDRA_TRACE_INSTRUMENT_DISABLE)] = 'false';
        process.env[ConfigProvider.configNameToEnvVar(ConfigNames.THUNDRA_LAMBDA_WARMUP_WARMUPAWARE)] = 'false';
        ConfigProvider.init();

        const config = new ThundraConfig({
            warmupAware: true,
            traceConfig: {
                disableRequest: true,
                disableResponse: true,
                disableInstrumentation: true
            }
        });
        expect(config.warmupAware).toEqual(false);
        expect(config.traceConfig.disableRequest).toEqual(false);
        expect(config.traceConfig.disableResponse).toEqual(false);
        expect(config.traceConfig.disableInstrumentation).toEqual(false);
    });

    test('with environment variable overrides programmatic with true value',() => {
        process.env[ConfigProvider.configNameToEnvVar(ConfigNames.THUNDRA_LAMBDA_TRACE_REQUEST_SKIP)] = 'true';
        process.env[ConfigProvider.configNameToEnvVar(ConfigNames.THUNDRA_LAMBDA_TRACE_RESPONSE_SKIP)] = 'true';
        process.env[ConfigProvider.configNameToEnvVar(ConfigNames.THUNDRA_TRACE_INSTRUMENT_DISABLE)] = 'true';
        process.env[ConfigProvider.configNameToEnvVar(ConfigNames.THUNDRA_LAMBDA_WARMUP_WARMUPAWARE)] = 'true';
        ConfigProvider.init();

        const config = new ThundraConfig({
            warmupAware: false,
            traceConfig: {
                disableRequest: false,
                disableResponse: false,
                disableInstrumentation: false
            }
        });
        
        expect(config.warmupAware).toEqual(true);
        expect(config.traceConfig.disableRequest).toEqual(true);
        expect(config.traceConfig.disableResponse).toEqual(true);
        expect(config.traceConfig.disableInstrumentation).toEqual(true);
    });

    describe('TraceConfig', () => {    
        test('with mask integration statements configuration programmatically',() => {
            const config = new ThundraConfig({
                traceConfig: {
                    maskRedisStatement: true,
                    maskRdbStatement: true,
                    maskDynamoDBStatement: true,
                    maskElasticSearchStatement: true
                }   
            });
            
            expect(config.traceConfig.maskRedisStatement).toEqual(true);
            expect(config.traceConfig.maskRdbStatement).toEqual(true);
            expect(config.traceConfig.maskDynamoDBStatement).toEqual(true);
            expect(config.traceConfig.maskElasticSearchStatement).toEqual(true);
        });
    }); 
});

