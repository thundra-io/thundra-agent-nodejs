import MetricConfig from '../../dist/plugins/config/MetricConfig';
import {envVariableKeys} from '../../dist/Constants';

describe('default Metric Config', () => {
    const config = new MetricConfig();

    it('Should enable default sampling rules',() => {
        expect(config.enabled).toBe(true);
        
        expect(config.samplerConfig.countAwareSamplerConfig.enabled).toEqual(true);
        expect(config.samplerConfig.countAwareSamplerConfig.countFreq).toEqual(100);

        expect(config.samplerConfig.timeAwareSamplerConfig.enabled).toEqual(true);
        expect(config.samplerConfig.timeAwareSamplerConfig.timeFreq).toEqual(300000);
    });
});

describe('default Metric Config', () => {
    process.env[envVariableKeys.THUNDRA_AGENT_METRIC_COUNT_AWARE_SAMPLER_COUNT_FREQ] = '500';
    process.env[envVariableKeys.THUNDRA_AGENT_METRIC_TIME_AWARE_SAMPLER_TIME_FREQ] = '10000';

    const config = new MetricConfig(); 

    it('Should get default samling value from environment variables',() => {
        expect(config.enabled).toBe(true);
        
        expect(config.samplerConfig.countAwareSamplerConfig.enabled).toEqual(true);
        expect(config.samplerConfig.countAwareSamplerConfig.countFreq).toEqual(500);

        expect(config.samplerConfig.timeAwareSamplerConfig.enabled).toEqual(true);
        expect(config.samplerConfig.timeAwareSamplerConfig.timeFreq).toEqual(10000);

        process.env[envVariableKeys.THUNDRA_AGENT_METRIC_SAMPLER_COUNTAWARE_COUNTFREQ] = null;
        process.env[envVariableKeys.THUNDRA_AGENT_METRIC_TIME_AWARE_SAMPLER_TIME_FREQ] =  null;
    });
});
