
import Utils from './utils/Utils';
import InvocationConfig from './config/InvocationConfig';
import PluginContext from './PluginContext';
import InvocationSupport from './support/InvocationSupport';
import InvocationTraceSupport from './support/InvocationTraceSupport';
import ExecutionContext from '../context/ExecutionContext';
import * as contextManager from '../context/contextManager';

export default class Invocation {
    pluginOrder: number = 2;
    pluginContext: PluginContext;
    options: InvocationConfig;
    hooks: { 'before-invocation': (execContext: ExecutionContext) => void;
             'after-invocation': (execContext: ExecutionContext) => void; };

    constructor(options?: any) {
        this.hooks = {
            'before-invocation': this.beforeInvocation,
            'after-invocation': this.afterInvocation,
        };
        this.options = options;
    }

    setPluginContext = (pluginContext: PluginContext) => {
        this.pluginContext = pluginContext;
    }

    beforeInvocation = (execContext: ExecutionContext) => {
        const { executor } = this.pluginContext;

        if (executor) {
            executor.startInvocation(this.pluginContext, execContext);
        }
    }

    afterInvocation = (execContext: ExecutionContext) => {
        const { executor } = this.pluginContext;

        if (executor) {
            executor.finishInvocation(this.pluginContext, execContext);
        }

        const { invocationData } = execContext;
        const { apiKey } = this.pluginContext;
        const reportData = Utils.generateReport(invocationData, apiKey);

        execContext.report(reportData);
        this.destroy();
    }

    destroy(): void {
        InvocationSupport.removeTags();
        InvocationSupport.removeAgentTags();
        InvocationTraceSupport.clear();
    }
}
