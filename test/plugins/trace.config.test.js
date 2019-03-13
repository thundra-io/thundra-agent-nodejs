import TraceConfig  from '../../dist/plugins/config/TraceConfig';
import TraceableConfig from '../../dist/plugins/config/TraceableConfig';
import Utils from '../utils';

describe('TraceConfig', () => {
    it('should parse single envirenment variable', () => {
        process.env.thundra_agent_lambda_trace_instrument_traceableConfig = 'album.getAlbum[traceArgs=true,traceReturnValue=true,traceError=true]'; 
        const traceConfig = new TraceConfig({});
        
        expect(traceConfig.traceableConfigs.length).toBe(1);
        expect(traceConfig.traceableConfigs[0].traceArgs).toBe(true);
        expect(traceConfig.traceableConfigs[0].traceError).toBe(true);
        expect(traceConfig.traceableConfigs[0].traceReturnValue).toBe(true);
        expect(traceConfig.traceableConfigs[0].pattern).toBe('album.getAlbum');

        delete process.env.thundra_agent_lambda_trace_instrument_traceableConfig;
    });

    it('should parse multiple environment variable', () => {
        process.env.thundra_agent_lambda_trace_instrument_traceableConfig1 = 'album.getAlbum[traceArgs=true,traceReturnValue=false, traceError=true]'; 
        process.env.thundra_agent_lambda_trace_instrument_traceableConfig2 = 'user.get*[traceArgs=true,traceReturnValue=true,traceError=false]'; 
        const traceConfig = new TraceConfig({});
        
        expect(traceConfig.traceableConfigs.length).toBe(2);
        expect(traceConfig.traceableConfigs[1].traceArgs).toBe(true);
        expect(traceConfig.traceableConfigs[1].traceError).toBe(false);
        expect(traceConfig.traceableConfigs[1].traceReturnValue).toBe(true);
        expect(traceConfig.traceableConfigs[1].pattern).toBe('user.get*');
        expect(traceConfig.traceableConfigs[1].shouldTraceFunction('user.get')).toBeTruthy();

        delete process.env.thundra_agent_lambda_trace_instrument_traceableConfig1;
        delete process.env.thundra_agent_lambda_trace_instrument_traceableConfig2;
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

describe('TraceOption', () => {

    it('should test shouldTrace', () => {
        const traceableConfigs = new TraceableConfig('album.get*');
        expect(traceableConfigs.shouldTraceFunction('album.getAlbum')).toBeTruthy();
        expect(traceableConfigs.shouldTraceFunction('album.setAlbum')).toBeFalsy();
    });

    it('should test shouldTrace with exactly match', () => {
        const traceableConfigs = new TraceableConfig('business.go');
        expect(traceableConfigs.shouldTraceFunction('business.go')).toBeTruthy();
    });

    it('should test shouldTraceFile', () => {
        const traceableConfigs = new TraceableConfig('business.go');
        expect(traceableConfigs.shouldTraceFile('business.*')).toBeTruthy();
    });
});

describe('TraceConfig', () => {
    beforeEach(() => {
        Utils.clearEnvironmentVariables();
    });

    afterEach(() => {
        Utils.clearEnvironmentVariables();
    });
    
    test('with mask integration statements configuration from environment variable',() => {
        process.env.thundra_agent_lambda_trace_integrations_redis_command_mask = 'true';
        process.env.thundra_agent_lambda_trace_integrations_rdb_statement_mask = 'true';
        process.env.thundra_agent_lambda_trace_integrations_aws_dynamodb_statement_mask = 'true';
        process.env.thundra_agent_lambda_trace_integrations_elastic_statement_mask = 'true';
    
        const config = new TraceConfig({});
        
        expect(config.maskRedisStatement).toEqual(true);
        expect(config.maskRdbStatement).toEqual(true);
        expect(config.maskDynamoDBStatement).toEqual(true);
        expect(config.maskElasticSearchStatement).toEqual(true);
    });
});
