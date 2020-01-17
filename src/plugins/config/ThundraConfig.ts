import TraceConfig from './TraceConfig';
import MetricConfig from './MetricConfig';
import InvocationConfig from './InvocationConfig';
import { TIMEOUT_MARGIN, envVariableKeys } from '../../Constants';
import LogConfig from './LogConfig';
import Utils from '../utils/Utils';
import AwsXRayConfig from './AwsXRayConfig';
const get = require('lodash.get');
const koalas = require('koalas');

class ThundraConfig {
    static configUpdates: any = {};

    trustAllCert: boolean;
    warmupAware: boolean;
    apiKey: string;
    disableThundra: boolean;
    traceConfig: TraceConfig;
    metricConfig: MetricConfig;
    invocationConfig: InvocationConfig;
    logConfig: LogConfig;
    xrayConfig: AwsXRayConfig;
    timeoutMargin: number;
    sampleTimedOutInvocations: boolean;
    enableCompositeData: boolean;

    constructor(options: any) {
        options = options ? options : {};

        this.apiKey = Utils.getConfiguration(envVariableKeys.THUNDRA_APIKEY, options.apiKey);
        this.disableThundra = Utils.getConfiguration(envVariableKeys.THUNDRA_DISABLE)
            ? Utils.getConfiguration(envVariableKeys.THUNDRA_DISABLE) === 'true'
            : options.disableThundra;
        this.timeoutMargin = koalas(parseInt(Utils.getConfiguration(envVariableKeys.THUNDRA_LAMBDA_TIMEOUT_MARGIN), 10),
            options.timeoutMargin, TIMEOUT_MARGIN);
        this.traceConfig = new TraceConfig(options.traceConfig);
        this.metricConfig = new MetricConfig(options.metricConfig);
        this.logConfig = new LogConfig(options.logConfig);
        this.invocationConfig = new InvocationConfig(options.invocationConfig);
        this.xrayConfig = new AwsXRayConfig(options.xrayConfig);

        this.trustAllCert = get(options, 'trustAllCert', false);

        this.warmupAware = Utils.getConfiguration(envVariableKeys.THUNDRA_LAMBDA_WARMUP_AWARE)
            ? Utils.getConfiguration(envVariableKeys.THUNDRA_LAMBDA_WARMUP_AWARE) === 'true'
            : options.warmupAware;

        this.sampleTimedOutInvocations = Utils.getConfiguration(envVariableKeys.THUNDRA_AGENT_LAMBDA_SAMPLE_TIMED_OUT_INVOCATIONS)
            ? Utils.getConfiguration(envVariableKeys.THUNDRA_AGENT_LAMBDA_SAMPLE_TIMED_OUT_INVOCATIONS) === 'true'
            : options.sampleTimedOutInvocations;

        this.enableCompositeData = Utils.getConfiguration(envVariableKeys.THUNDRA_LAMBDA_REPORT_REST_COMPOSITE_ENABLED)
            ? Utils.getConfiguration(envVariableKeys.THUNDRA_LAMBDA_REPORT_REST_COMPOSITE_ENABLED) === 'true'
            : options.enableCompositeData;
    }

    static updateConfig(options: any) {
        const configUpdates = ThundraConfig.configUpdates;
        ThundraConfig.configUpdates = { ...configUpdates, ...options };
    }

    refreshConfig() {
        // No extraKeys, no need to update the initialConfig
        if (Object.keys(ThundraConfig.configUpdates).length === 0) {
            return;
        }

        const configUpdates = ThundraConfig.configUpdates;

        this.traceConfig.updateConfig(configUpdates);
        this.metricConfig.updateConfig(configUpdates);
        this.logConfig.updateConfig(configUpdates);
        this.xrayConfig.updateConfig(configUpdates);

        this.trustAllCert = get(configUpdates, 'trustAllCert', this.trustAllCert);

        ThundraConfig.configUpdates = {};
    }
}

export default ThundraConfig;
