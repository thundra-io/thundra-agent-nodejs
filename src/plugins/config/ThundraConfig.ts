import TraceConfig from './TraceConfig';
import MetricConfig from './MetricConfig';
import InvocationConfig from './InvocationConfig';
import {TIMEOUT_MARGIN} from '../../Constants';
import LogConfig from './LogConfig';
const koalas = require('koalas');

class ThundraConfig {

    trustAllCert: boolean;
    apiKey: string;
    disableThundra: boolean;
    traceConfig: TraceConfig;
    metricConfig: MetricConfig;
    invocationConfig: InvocationConfig;
    logConfig: LogConfig;
    timeoutMargin: number;
    plugins: any [];

    constructor(options: any) {
        options = options ? options : {};
        this.plugins = koalas(options.plugins, []);
        this.apiKey = koalas(process.env.thundra_apiKey, options.apiKey, '');
        this.disableThundra = koalas(process.env.thundra_disable, options.disableThundra, false);
        this.timeoutMargin = koalas(process.env.thundra_lambda_timeout_margin, options.timeoutMargin, TIMEOUT_MARGIN);
        this.traceConfig = new TraceConfig(options.traceConfig);
        this.metricConfig = new MetricConfig(options.metricConfig);
        this.logConfig = new LogConfig(options.logConfig);
        this.invocationConfig = new InvocationConfig(options.invocationConfig);
        this.trustAllCert = koalas(process.env.thundra_lambda_publish_rest_trustAllCertificates, options.trustAllCert, false);
    }

}

export default ThundraConfig;
