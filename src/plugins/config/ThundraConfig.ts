import TraceConfig from './TraceConfig';
import MetricConfig from './MetricConfig';
import InvocationConfig from './InvocationConfig';
import { TIMEOUT_MARGIN } from '../../Constants';
import ConfigProvider from '../../config/ConfigProvider';
import ConfigNames from '../../config/ConfigNames';
import LogConfig from './LogConfig';
const get = require('lodash.get');
const koalas = require('koalas');

/**
 * Configures Thundra agent
 */
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
    testProjectId: string;
    testRunId: string;

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
        this.testProjectId = ConfigProvider.get<string>(
            ConfigNames.THUNDRA_AGENT_TEST_PROJECT_ID,
            options.testProjectId);
        this.testRunId = ConfigProvider.get<string>(
            ConfigNames.THUNDRA_AGENT_TEST_RUN_ID,
            options.testRunId);
        this.disableMonitoring = get(options, 'disableMonitoring', !(this.apiKey));
        this.traceConfig = new TraceConfig(options.traceConfig);
        this.metricConfig = new MetricConfig(options.metricConfig);
        this.logConfig = new LogConfig(options.logConfig);
        this.invocationConfig = new InvocationConfig(options.invocationConfig);
    }

    /**
     * Updates configuration by options
     * @param options the options to update configuration
     */
    static updateConfig(options: any) {
        const configUpdates = ThundraConfig.configUpdates;
        ThundraConfig.configUpdates = { ...configUpdates, ...options };
    }

    /**
     * Refreshes config
     */
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
