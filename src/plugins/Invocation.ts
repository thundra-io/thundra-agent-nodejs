
import InvocationData from './data/invocation/InvacationData';
import Utils from './Utils';
import TimeoutError from './error/TimeoutError';
import InvocationConfig from './config/InvocationConfig';
import MonitorDataType from './data/base/MonitoringDataType';
import { DATA_MODEL_VERSION, LAMBDA_APPLICATION_DOMAIN_NAME,
    LAMBDA_APPLICATION_CLASS_NAME, LAMBDA_FUNCTION_PLATFORM} from '../Constants';
import BuildInfoLoader from '../BuildInfoLoader';
import MonitoringDataType from './data/base/MonitoringDataType';

class Invocation {
    public hooks: { 'before-invocation': (data: any) => void; 'after-invocation': (data: any) => void; };
    public options: InvocationConfig;
    public invocationData: InvocationData;
    public reporter: any;
    public pluginContext: any;
    public apiKey: any;
    public finishTimestamp: any;
    public startTimestamp: number;

    constructor(options: any) {
        this.hooks = {
            'before-invocation': this.beforeInvocation,
            'after-invocation': this.afterInvocation,
        };
        this.options = options;
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
        this.finishTimestamp = null;
        this.startTimestamp = Date.now();

        this.invocationData = Utils.initMonitoringData(this.pluginContext,
            originalContext, MonitoringDataType.INVOCATION) as InvocationData;

        this.invocationData.applicationTags = {};
        this.invocationData.functionPlatform = LAMBDA_FUNCTION_PLATFORM;
        this.invocationData.functionName = originalContext.functionName;
        this.invocationData.functionRegion = this.pluginContext.applicationRegion;
        this.invocationData.tags = {};
        this.invocationData.startTimestamp = this.startTimestamp;
        this.invocationData.finishTimestamp = 0;
        this.invocationData.duration = 0;
        this.invocationData.erroneous = false;
        this.invocationData.errorType = '';
        this.invocationData.errorMessage = '';
        this.invocationData.coldStart = this.pluginContext.requestCount === 0;
        this.invocationData.timeout = false;

        this.invocationData.transactionId = transactionId;
        this.invocationData.spanId = transactionId;
        this.invocationData.traceId = transactionId;

        this.invocationData.tags['aws.lambda.memory_limit'] = parseInt(originalContext.memoryLimitInMB, 10);
        this.invocationData.tags['aws.lambda.invocation.request_id '] = originalContext.awsRequestId;
        this.invocationData.tags['aws.lambda.arn'] = originalContext.invokedFunctionArn;
        this.invocationData.tags['aws.lambda.invocation.coldstart'] = this.pluginContext.requestCount === 0;
        this.invocationData.tags['aws.region'] = this.pluginContext.applicationRegion;
        this.invocationData.tags['aws.lambda.log_group_name'] = originalContext.logGroupName;
        this.invocationData.tags['aws.lambda.invocation.timeout'] = false;
        this.invocationData.tags['aws.lambda.name'] = originalContext.functionName;
        this.invocationData.tags['aws.lambda.log_stream_name'] = originalContext.logStreamName;

    }

    afterInvocation = (data: any) => {
        if (data.error) {
            const { errorType, errorMessage } = Utils.parseError(data.error);
            this.invocationData.erroneous = true;
            if (data.error instanceof TimeoutError) {
                this.invocationData.timeout = true;
                this.invocationData.tags['aws.lambda.invocation.timeout'] = true;
            }

            this.invocationData.errorType = errorType;
            this.invocationData.errorMessage = errorMessage;
        }
        this.finishTimestamp = Date.now();
        this.invocationData.duration = this.finishTimestamp - this.startTimestamp;
        const reportData = Utils.generateReport(this.invocationData, this.apiKey);
        this.report(reportData);
    }
}

export default function instantiateInvocationPlugin(config: InvocationConfig) {
    return new Invocation(config);
}
