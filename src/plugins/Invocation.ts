
import InvocationData from './data/invocation/InvocationData';
import Utils from './utils/Utils';
import TimeoutError from './error/TimeoutError';
import InvocationConfig from './config/InvocationConfig';
import {HttpTags, LAMBDA_FUNCTION_PLATFORM} from '../Constants';
import MonitoringDataType from './data/base/MonitoringDataType';
import PluginContext from './PluginContext';
import InvocationSupport from './support/InvocationSupport';
import InvocationTraceSupport from './support/InvocationTraceSupport';
import {LambdaUtils} from './utils/LambdaUtils';

class Invocation {
    hooks: { 'before-invocation': (data: any) => void; 'after-invocation': (data: any) => void; };
    options: InvocationConfig;
    invocationData: InvocationData;
    reporter: any;
    pluginContext: PluginContext;
    apiKey: any;
    finishTimestamp: any;
    startTimestamp: number;
    pluginOrder: number = 2;

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

    setPluginContext = (pluginContext: PluginContext) => {
        this.pluginContext = pluginContext;
        this.apiKey = pluginContext.apiKey;
    }

    beforeInvocation = (data: any) => {
        const { originalContext, reporter } = data;
        this.reporter = reporter;
        this.finishTimestamp = null;
        this.startTimestamp = this.pluginContext.invocationStartTimestamp;

        InvocationSupport.clearError();

        this.invocationData = Utils.initMonitoringData(this.pluginContext,
                             MonitoringDataType.INVOCATION) as InvocationData;

        this.invocationData.applicationPlatform = LAMBDA_FUNCTION_PLATFORM;
        this.invocationData.functionRegion = this.pluginContext.applicationRegion;
        this.invocationData.tags = {};
        this.invocationData.userTags = {};
        this.invocationData.startTimestamp = this.startTimestamp;
        this.invocationData.finishTimestamp = 0;
        this.invocationData.duration = 0;
        this.invocationData.erroneous = false;
        this.invocationData.errorType = '';
        this.invocationData.errorMessage = '';
        this.invocationData.coldStart = this.pluginContext.requestCount === 0;
        this.invocationData.timeout = false;

        this.invocationData.transactionId = this.pluginContext.transactionId ?
            this.pluginContext.transactionId : originalContext.awsRequestId;

        this.invocationData.spanId = this.pluginContext.spanId;
        this.invocationData.traceId = this.pluginContext.traceId;

        const xrayTraceInfo = Utils.getXRayTraceInfo();

        if (xrayTraceInfo.traceID) {
            this.invocationData.tags['aws.xray.trace.id'] = xrayTraceInfo.traceID;
        }
        if (xrayTraceInfo.segmentID) {
            this.invocationData.tags['aws.xray.segment.id'] = xrayTraceInfo.segmentID;
        }

        this.invocationData.tags['aws.lambda.memory_limit'] = this.pluginContext.maxMemory;
        this.invocationData.tags['aws.lambda.arn'] = originalContext.invokedFunctionArn;
        this.invocationData.tags['aws.account_no'] = LambdaUtils.getAWSAccountNo(originalContext.invokedFunctionArn);
        this.invocationData.tags['aws.lambda.invocation.coldstart'] = this.pluginContext.requestCount === 0;
        this.invocationData.tags['aws.region'] = this.pluginContext.applicationRegion;
        this.invocationData.tags['aws.lambda.log_group_name'] = originalContext ? originalContext.logGroupName : '';
        this.invocationData.tags['aws.lambda.invocation.timeout'] = false;
        this.invocationData.tags['aws.lambda.name'] = originalContext ? originalContext.functionName : '';
        this.invocationData.tags['aws.lambda.log_stream_name'] = originalContext.logStreamName;
        this.invocationData.tags['aws.lambda.invocation.request_id'] = originalContext.awsRequestId;
        const { heapUsed } = process.memoryUsage();
        this.invocationData.tags['aws.lambda.invocation.memory_usage'] = Math.floor(heapUsed / (1024 * 1024));
    }

    afterInvocation = (data: any) => {
        if (InvocationSupport.hasError()) {
            this.invocationData.setError(InvocationSupport.error);
        }

        if (data.error) {
            const error = Utils.parseError(data.error);
            this.invocationData.setError(error);
            if (data.error instanceof TimeoutError) {
                this.invocationData.timeout = true;
                this.invocationData.tags['aws.lambda.invocation.timeout'] = true;
            }

            this.invocationData.tags.error = true;
            this.invocationData.tags['error.message'] = error.errorMessage;
            this.invocationData.tags['error.kind'] = error.errorType;
            this.invocationData.tags['error.stack'] = error.stack;
            if (error.code) {
                this.invocationData.tags['error.code'] = error.code;
            }
            if (error.stack) {
                this.invocationData.tags['error.stack'] = error.stack;
            }
        }

        this.invocationData.setTags(InvocationSupport.tags);
        this.invocationData.setUserTags(InvocationSupport.userTags);
        this.finishTimestamp = this.pluginContext.invocationFinishTimestamp;
        this.invocationData.finishTimestamp = this.finishTimestamp;
        this.invocationData.duration = this.finishTimestamp - this.startTimestamp;
        this.invocationData.resources = InvocationTraceSupport.getResources(this.pluginContext.spanId);
        this.invocationData.incomingTraceLinks = InvocationTraceSupport.getIncomingTraceLinks();
        this.invocationData.outgoingTraceLinks = InvocationTraceSupport.getOutgoingTraceLinks();

        if (Utils.isValidResponse(data.response)) {
            this.invocationData.setUserTags({[HttpTags.HTTP_STATUS]: data.response.statusCode});
        }

        const reportData = Utils.generateReport(this.invocationData, this.apiKey);
        this.report(reportData);

        this.destroy();
    }

    destroy(): void {
        InvocationSupport.removeTags();
        InvocationSupport.removeAgentTags();
        InvocationTraceSupport.clear();
    }
}

export default function instantiateInvocationPlugin(config: InvocationConfig) {
    return new Invocation(config);
}
