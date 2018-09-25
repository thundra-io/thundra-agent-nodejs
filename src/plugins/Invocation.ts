
import InvocationData from './data/invocation/InvacationData';
import Utils from './Utils';
import TimeoutError from './error/TimeoutError';
import InvocationConfig from './config/InvocationConfig';
import MonitorDataType from './data/base/MonitorDataType';
import { DATA_FORMAT_VERSION, LAMBDA_APPLICATION_DOMAIN_NAME,
    LAMBDA_APPLICATION_CLASS_NAME, LAMBDA_FUNCTION_PLATFORM} from '../Constants';
class Invocation {
    public hooks: { 'before-invocation': (data: any) => void; 'after-invocation': (data: any) => void; };
    public options: InvocationConfig;
    public invocationData: InvocationData;
    public reporter: any;
    public pluginContext: any;
    public apiKey: any;
    public endTimestamp: any;
    public startTimestamp: number;

    constructor(options: any) {
        this.hooks = {
            'before-invocation': this.beforeInvocation,
            'after-invocation': this.afterInvocation,
        };
        this.options = options;
        this.invocationData = new InvocationData();
    }

    report(data: any): void {
        this.reporter.addReport(data);
    }

    setPluginContext = (pluginContext: any) => {
        this.pluginContext = pluginContext;
        this.apiKey = pluginContext.apiKey;
    }

    beforeInvocation = (data: any) => {
        const { originalContext, reporter, transactionId } = data;
        this.reporter = reporter;
        this.endTimestamp = null;
        this.startTimestamp = Date.now();

        this.invocationData.id = Utils.generateId();
        this.invocationData.type = MonitorDataType.INVOCATION;
        // this.invocationData.agentVersion = Utils.getPackageVersion('.');
        this.invocationData.dataModelVersion = DATA_FORMAT_VERSION;
        this.invocationData.applicationId =  this.pluginContext.applicationId;
        this.invocationData.applicationDomainName = LAMBDA_APPLICATION_DOMAIN_NAME;
        this.invocationData.applicationClassName = LAMBDA_APPLICATION_CLASS_NAME;
        this.invocationData.applicationName = originalContext.functionName;
        this.invocationData.applicationVersion = this.pluginContext.applicationVersion;
        this.invocationData.applicationStage = process.env.thundra_application_stage ? process.env.thundra_application_stage : '';
        this.invocationData.applicationRuntimeVersion = process.version;
        this.invocationData.applicationTags = new Map<string, any>();
        this.invocationData.functionPlatform = LAMBDA_FUNCTION_PLATFORM;
        this.invocationData.functionName = originalContext.functionName;
        this.invocationData.functionRegion = this.pluginContext.applicationRegion;
        this.invocationData.tags = new Map<string, any>();

        /*this.invocationData.traceId = '';
        this.invocationData.transactionId = '';
        this.invocationData.spanId = '';*/

        this.invocationData.duration = 0;
        this.invocationData.erroneous = false;
        this.invocationData.errorType = '';
        this.invocationData.errorMessage = '';
        this.invocationData.coldStart = this.pluginContext.requestCount === 0;
        this.invocationData.timeout = false;

        // this.invocationData.region = this.pluginContext.applicationRegion;
        // this.invocationData.memorySize = parseInt(originalContext.memoryLimitInMB, 10);

    }

    afterInvocation = (data: any) => {
        if (data.error) {
            const { errorType, errorMessage } = Utils.parseError(data.error);
            this.invocationData.erroneous = true;
            if (data.error instanceof TimeoutError) {
                this.invocationData.timeout = true;
            }

            this.invocationData.errorType = errorType;
            this.invocationData.errorMessage = errorMessage;
        }
        this.endTimestamp = Date.now();
        this.invocationData.duration = this.endTimestamp - this.startTimestamp;
        const reportData = Utils.generateReport(this.invocationData, MonitorDataType.INVOCATION, this.apiKey);
        this.report(reportData);
    }
}

export default function instantiateInvocationPlugin(config: InvocationConfig) {
    return new Invocation(config);
}
