
import InvocationData from './data/invocation/InvacationData';
import Utils from './Utils';
import TimeoutError from './error/TimeoutError';

class Invocation {
    public hooks: { 'before-invocation': (data: any) => void; 'after-invocation': (data: any) => void; };
    public options: any;
    public dataType: string;
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
        this.dataType = 'InvocationData';
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
        this.invocationData.transactionId = transactionId;
        this.invocationData.applicationName = originalContext.functionName;
        this.invocationData.applicationId =  this.pluginContext.applicationId;
        this.invocationData.applicationVersion = this.pluginContext.applicationVersion;
        this.invocationData.applicationProfile = this.pluginContext.applicationProfile;
        this.invocationData.duration = 0;
        this.invocationData.startTimestamp = this.startTimestamp;
        this.invocationData.endTimestamp = 0;
        this.invocationData.erroneous = false;
        this.invocationData.errorType = '';
        this.invocationData.errorMessage = '';
        this.invocationData.coldStart = this.pluginContext.requestCount === 0;
        this.invocationData.timeout = false;
        this.invocationData.region = this.pluginContext.applicationRegion;
        this.invocationData.memorySize = parseInt(originalContext.memoryLimitInMB, 10);

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
        this.invocationData.endTimestamp = this.endTimestamp;
        this.invocationData.duration = this.endTimestamp - this.startTimestamp;
        const reportData = Utils.generateReport(this.invocationData, this.dataType, this.apiKey);
        this.report(reportData);
    }
}

export default function instantiateInvocationPlugin(options: any) {
    return new Invocation(options);
}
