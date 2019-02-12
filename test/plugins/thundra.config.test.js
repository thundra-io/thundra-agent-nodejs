import ThundraConfig from '../../dist/plugins/config/ThundraConfig';

describe('Trace Config Test', () => {
    it('with programmatic config',() => {
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

    it('with environment variable overrides programmatic',() => {
        process.env.thundra_agent_lambda_trace_request_skip = 'false';
        process.env.thundra_agent_lambda_trace_response_skip = 'false';
        process.env.thundra_agent_lambda_trace_instrument_disable = 'false';
        process.env.thundra_lambda_warmup_warmupAware = 'false';

        const config = new ThundraConfig({
            warmupAware: true,
            traceConfig: {
                disableRequest: true,
                disableResponse: true,
                disableInstrumentation: true
            }
        });

        expect(config.traceConfig.disableRequest).toEqual(false);
        expect(config.traceConfig.disableResponse).toEqual(false);
        expect(config.traceConfig.disableInstrumentation).toEqual(false);

        process.env.thundra_agent_lambda_trace_request_skip = undefined;
        process.env.thundra_agent_lambda_trace_response_skip = undefined;
        process.env.thundra_agent_lambda_trace_instrument_disable = undefined;
        process.env.thundra_lambda_warmup_warmupAware = undefined;
    });
});

