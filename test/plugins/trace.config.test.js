import ConfigProvider from '../../dist/config/ConfigProvider';
import ConfigNames from '../../dist/config/ConfigNames';
import TraceConfig  from '../../dist/plugins/config/TraceConfig';
import Utils from '../utils';

describe('TraceConfig', () => {
    beforeEach(() => {
        Utils.clearEnvironmentVariables();
        ConfigProvider.clear();
    });

    afterEach(() => {
        Utils.clearEnvironmentVariables();
        ConfigProvider.clear();
    });

    it('should parse single envirenment variable', () => {
        Utils.clearEnvironmentVariables();
        process.env[ConfigProvider.configNameToEnvVar(ConfigNames.THUNDRA_TRACE_INSTRUMENT_TRACEABLECONFIG)] = 'album.getAlbum[traceArgs=true,traceReturnValue=true,traceError=true]';
        ConfigProvider.init();

        const traceConfig = new TraceConfig({});
        
        expect(traceConfig.traceableConfigs.length).toBe(1);
        expect(traceConfig.traceableConfigs[0].traceArgs).toBe(true);
        expect(traceConfig.traceableConfigs[0].traceError).toBe(true);
        expect(traceConfig.traceableConfigs[0].traceReturnValue).toBe(true);
        expect(traceConfig.traceableConfigs[0].pattern).toBe('album.getAlbum');
    });

    it('should parse multiple environment variable', () => {
        Utils.clearEnvironmentVariables();
        process.env[ConfigProvider.configNameToEnvVar(ConfigNames.THUNDRA_TRACE_INSTRUMENT_TRACEABLECONFIG + '1')] = 'album.getAlbum[traceArgs=true,traceReturnValue=false, traceError=true]';
        process.env[ConfigProvider.configNameToEnvVar(ConfigNames.THUNDRA_TRACE_INSTRUMENT_TRACEABLECONFIG + '2')] = 'user.get*[traceArgs=true,traceReturnValue=true,traceError=false]';
        ConfigProvider.init();

        const traceConfig = new TraceConfig({});

        expect(traceConfig.traceableConfigs.length).toBe(2);
        expect(traceConfig.traceableConfigs[1].traceArgs).toBe(true);
        expect(traceConfig.traceableConfigs[1].traceError).toBe(false);
        expect(traceConfig.traceableConfigs[1].traceReturnValue).toBe(true);
        expect(traceConfig.traceableConfigs[1].pattern).toBe('user.get*');
        expect(traceConfig.traceableConfigs[1].shouldTraceFunction('user.get')).toBeTruthy();
    });

    it('should parse from programatic config', () => {
        const traceConfig = new TraceConfig( {
            traceableConfigs: [{
                pattern : 'business.f*',
                traceArgs: true,
                traceReturnValue: false,
                traceError: true,
            }]
        });
        
        expect(traceConfig.traceableConfigs.length).toBe(1);
        expect(traceConfig.traceableConfigs[0].traceArgs).toBe(true);
        expect(traceConfig.traceableConfigs[0].traceError).toBe(true);
        expect(traceConfig.traceableConfigs[0].traceReturnValue).toBe(false);
        expect(traceConfig.traceableConfigs[0].pattern).toBe('business.f*');
    });
});

describe('TraceConfig', () => {
    beforeEach(() => {
        Utils.clearEnvironmentVariables();
        ConfigProvider.clear();
    });

    afterEach(() => {
        Utils.clearEnvironmentVariables();
        ConfigProvider.clear();
    });
    
    test('with mask integration statements configuration from environment variable',() => {
        process.env[ConfigProvider.configNameToEnvVar(ConfigNames.THUNDRA_TRACE_INTEGRATIONS_REDIS_COMMAND_MASK)] = 'true';
        process.env[ConfigProvider.configNameToEnvVar(ConfigNames.THUNDRA_TRACE_INTEGRATIONS_RDB_STATEMENT_MASK)] = 'true';
        process.env[ConfigProvider.configNameToEnvVar(ConfigNames.THUNDRA_TRACE_INTEGRATIONS_AWS_DYNAMODB_STATEMENT_MASK)] = 'true';
        process.env[ConfigProvider.configNameToEnvVar(ConfigNames.THUNDRA_TRACE_INTEGRATIONS_ELASTICSEARCH_BODY_MASK)] = 'true';
        ConfigProvider.init();
    
        const config = new TraceConfig({});
        
        expect(config.maskRedisStatement).toEqual(true);
        expect(config.maskRdbStatement).toEqual(true);
        expect(config.maskDynamoDBStatement).toEqual(true);
        expect(config.maskElasticSearchStatement).toEqual(true);
    });
});
