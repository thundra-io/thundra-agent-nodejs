import Utils from './Utils';
import LogConfig from './config/LogConfig';

class Log {
    hooks: { 'before-invocation': (data: any) => void; };
    options: LogConfig;
    reporter: any;
    pluginContext: any;
    apiKey: any;
    contextId: any;
    originalContext: any;

    constructor(options: LogConfig) {
        this.hooks = {
            'before-invocation': this.beforeInvocation,
        };
        this.options = options;
    }

    report = (logReport: any) => {
        if (this.reporter) {
            this.reporter.addReport(logReport);
        }
    }

    setPluginContext = (pluginContext: any) => {
        this.pluginContext = pluginContext;
        this.apiKey = pluginContext.apiKey;
    }

    beforeInvocation = (data: any) => {
        this.reporter = data.reporter;
        this.contextId = data.contextId;
        this.originalContext = data.originalContext;
    }

    reportLog = (logData: any) => {
        const logReport = {
            data: {
                ...logData,
                id: Utils.generateId(),
                rootExecutionAuditContextId: this.contextId,
                applicationName: this.originalContext.functionName,
                applicationId: this.pluginContext.applicationId,
                applicationVersion: this.pluginContext.applicationVersion,
                applicationProfile: this.pluginContext.applicationProfile,
                applicationType: 'node',
                log: logData.logMessage,
            },
            type: 'MonitoredLog',
            apiKey: this.apiKey,
            dataFormatVersion: '1.0',
        };
        this.report(logReport);
    }
}

export default function instantiateLogPlugin(config: LogConfig) {
    return new Log(config);
}
