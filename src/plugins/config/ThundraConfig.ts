import TraceConfig from './TraceConfig';
import MetricConfig from './MetricConfig';
import InvocationConfig from './InvocationConfig';
const koalas = require('koalas');

class ThundraConfig {
    trustAllCert: boolean;
    apiKey: string;
    disableThundra: boolean;
    traceConfig: TraceConfig;
    metricConfig: MetricConfig;
    invocationConfig: InvocationConfig;
    timeoutMargin: number = 200;
    plugins: any [];

    constructor(options: any) {
        options = options ? options : {};
        this.plugins = koalas(options.plugins, []);
        this.apiKey = koalas(process.env.thundra_apiKey, options.apiKey, '');
        this.disableThundra = koalas(process.env.thundra_disable, options.disableThundra, false);
        this.timeoutMargin = koalas(process.env.thundra_lambda_timeout_margin, options.timeoutMargin, 200);
        this.traceConfig = new TraceConfig(options.traceConfig);
        this.metricConfig = new MetricConfig(options.metricConfig);
        this.invocationConfig = new InvocationConfig(options.invocationConfig);
        this.trustAllCert = koalas(process.env.thundra_lambda_publish_rest_trustAllCertificates, options.trustAllCert, false);
    }
}

export default ThundraConfig;
