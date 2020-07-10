
import Utils from './utils/Utils';
import InvocationConfig from './config/InvocationConfig';
import PluginContext from './PluginContext';
import InvocationSupport from './support/InvocationSupport';
import InvocationTraceSupport from './support/InvocationTraceSupport';

const get = require('lodash.get');

export default class Invocation {
    pluginOrder: number = 2;
    pluginContext: PluginContext;
    options: InvocationConfig;
    hooks: { 'before-invocation': (pluginContext: PluginContext) => void;
             'after-invocation': (pluginContext: PluginContext) => void; };

    constructor(options?: any) {
        this.hooks = {
            'before-invocation': this.beforeInvocation,
            'after-invocation': this.afterInvocation,
        };
        this.options = options;
    }

    report(data: any, execContext: any): void {
        const reports = get(execContext, 'reports', []);
        execContext.reports = [...reports, data];
    }

    setPluginContext = (pluginContext: PluginContext) => {
        this.pluginContext = pluginContext;
    }

    beforeInvocation = (execContext: any) => {
        const { executor } = this.pluginContext;

        if (executor) {
            executor.startInvocation(this.pluginContext, execContext);
        }
    }

    afterInvocation = (execContext: any) => {
        const { executor } = this.pluginContext;

        if (executor) {
            executor.finishInvocation(this.pluginContext, execContext);
        }

        const { invocationData } = execContext;
        const { apiKey } = this.pluginContext;
        const reportData = Utils.generateReport(invocationData, apiKey);

        this.report(reportData, execContext);
        this.destroy();
    }

    destroy(): void {
        InvocationSupport.removeTags();
        InvocationSupport.removeAgentTags();
        InvocationTraceSupport.clear();
    }
}
