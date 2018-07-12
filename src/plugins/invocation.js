import {generateId, generateReport, parseError} from './utils';
import {TimeoutError} from '../constants';

class Invocation {
    constructor(options) {
        this.hooks = {
            'before-invocation': this.beforeInvocation,
            'after-invocation': this.afterInvocation
        };
        this.options = options;
        this.dataType = 'InvocationData';
        this.invocationData = {};
    }

    report = (data) => {
        this.reporter.addReport(data);
    };

    setPluginContext = (pluginContext) => {
        this.pluginContext = pluginContext;
        this.apiKey = pluginContext.apiKey;
    };

    beforeInvocation = (data) => {
        const {originalContext, reporter, transactionId} = data;
        this.reporter = reporter;
        this.endTimestamp = null;
        this.startTimestamp = Date.now();
        this.invocationData = {
            id: generateId(),
            transactionId: transactionId,
            applicationName: originalContext.functionName,
            applicationId: this.pluginContext.applicationId,
            applicationVersion: this.pluginContext.applicationVersion,
            applicationProfile: this.pluginContext.applicationProfile,
            applicationType: 'node',
            duration: null,
            startTimestamp: this.startTimestamp,
            endTimestamp: null,
            erroneous: false,
            errorType: '',
            errorMessage: '',
            coldStart: this.pluginContext.requestCount === 0,
            timeout: false,
            region: this.pluginContext.applicationRegion,
            memorySize: parseInt(originalContext.memoryLimitInMB),
        };
    };

    afterInvocation = (data) => {
        if (data.error) {
            const {errorType, errorMessage} = parseError(data.error);
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
        const reportData = generateReport(this.invocationData, this.dataType, this.apiKey);
        this.report(reportData);
    };
}


export default function instantiateInvocationPlugin(options) {
    return new Invocation(options);
};
