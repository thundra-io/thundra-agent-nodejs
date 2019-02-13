import TraceConfig from './TraceConfig';
import MetricConfig from './MetricConfig';
import InvocationConfig from './InvocationConfig';
import { TIMEOUT_MARGIN, envVariableKeys } from '../../Constants';
import LogConfig from './LogConfig';
import Utils from '../utils/Utils';
import AwsXRayConfig from './AwsXRayConfig';
const koalas = require('koalas');

class ThundraConfig {

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
    plugins: any[];

    constructor(options: any) {
        options = options ? options : {};
        this.plugins = koalas(options.plugins, []);
        this.apiKey = koalas(Utils.getConfiguration(envVariableKeys.THUNDRA_APIKEY), options.apiKey, null);
        this.disableThundra = koalas(Utils.getConfiguration(envVariableKeys.THUNDRA_DISABLE), options.disableThundra, false);
        this.timeoutMargin = koalas(parseInt(Utils.getConfiguration(envVariableKeys.THUNDRA_LAMBDA_TIMEOUT_MARGIN), 10),
            options.timeoutMargin, TIMEOUT_MARGIN);
        this.traceConfig = new TraceConfig(options.traceConfig);
        this.metricConfig = new MetricConfig(options.metricConfig);
        this.logConfig = new LogConfig(options.logConfig);
        this.invocationConfig = new InvocationConfig(options.invocationConfig);
        this.xrayConfig = new AwsXRayConfig(options.xrayConfig);
        this.trustAllCert = koalas(Utils.getConfiguration(
            envVariableKeys.THUNDRA_AGENT_LAMBDA_TRUST_ALL_CERTIFICATES), options.trustAllCert, false);
        this.warmupAware = Utils.getConfiguration(
                envVariableKeys.THUNDRA_LAMBDA_WARMUP_AWARE) ? Utils.getConfiguration(
                    envVariableKeys.THUNDRA_LAMBDA_WARMUP_AWARE) === 'true' : options.warmupAware;
    }

}

export default ThundraConfig;
