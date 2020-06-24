import TraceConfig from './TraceConfig';
import MetricConfig from './MetricConfig';
import InvocationConfig from './InvocationConfig';
import { TIMEOUT_MARGIN } from '../../Constants';
import ConfigProvider from '../../config/ConfigProvider';
import ConfigNames from '../../config/ConfigNames';
import LogConfig from './LogConfig';
const get = require('lodash.get');
const koalas = require('koalas');

class ThundraConfig {

    static configUpdates: any = {};

    trustAllCert: boolean;
    warmupAware: boolean;
    apiKey: string;
    disableMonitoring: boolean;
    disableThundra: boolean;
    traceConfig: TraceConfig;
    metricConfig: MetricConfig;
    invocationConfig: InvocationConfig;
    logConfig: LogConfig;
    timeoutMargin: number;

    constructor(options: any) {
        options = options ? options : {};

        this.apiKey = ConfigProvider.get<string>(
            ConfigNames.THUNDRA_APIKEY,
            options.apiKey);
        this.disableThundra = ConfigProvider.get<boolean>(
            ConfigNames.THUNDRA_DISABLE,
            options.disableThundra);
        this.timeoutMargin = koalas(
            ConfigProvider.get<number>(ConfigNames.THUNDRA_LAMBDA_TIMEOUT_MARGIN),
            options.timeoutMargin,
            TIMEOUT_MARGIN);
        this.trustAllCert = ConfigProvider.get<boolean>(
            ConfigNames.THUNDRA_REPORT_REST_TRUSTALLCERTIFICATES,
            options.trustAllCert);
        this.warmupAware = ConfigProvider.get<boolean>(
            ConfigNames.THUNDRA_LAMBDA_WARMUP_WARMUPAWARE,
            options.warmupAware);
        this.disableMonitoring = get(options, 'disableMonitoring', !(this.apiKey));
        this.traceConfig = new TraceConfig(options.traceConfig);
        this.metricConfig = new MetricConfig(options.metricConfig);
        this.logConfig = new LogConfig(options.logConfig);
        this.invocationConfig = new InvocationConfig(options.invocationConfig);
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

        this.trustAllCert = get(configUpdates, 'trustAllCert', this.trustAllCert);

        ThundraConfig.configUpdates = {};
    }

}

export default ThundraConfig;
