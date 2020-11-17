import Utils from '../utils/Utils';
import InvocationConfig from './config/InvocationConfig';
import PluginContext from './PluginContext';
import ExecutionContext from '../context/ExecutionContext';
import ThundraLogger from '../ThundraLogger';

const get = require('lodash.get');

/**
 * The invocation plugin
 */
export default class Invocation {

    pluginOrder: number = 2;
    pluginContext: PluginContext;
    options: InvocationConfig;
    hooks: {
        'before-invocation': (execContext: ExecutionContext) => void;
        'after-invocation': (execContext: ExecutionContext) => void;
    };

    constructor(options?: InvocationConfig) {
        this.hooks = {
            'before-invocation': this.beforeInvocation,
            'after-invocation': this.afterInvocation,
        };
        this.options = options;
    }

    /**
     * Sets the the {@link PluginContext}
     * @param {PluginContext} pluginContext the {@link PluginContext}
     */
    setPluginContext = (pluginContext: PluginContext) => {
        this.pluginContext = pluginContext;
    }

    /**
     * Called before invocation
     * @param {ExecutionContext} execContext the {@link ExecutionContext}
     */
    beforeInvocation = (execContext: ExecutionContext) => {
        ThundraLogger.debug('<Invocation> Before invocation of transaction', execContext.transactionId);

        const { executor } = this.pluginContext;

        if (executor) {
            executor.startInvocation(this.pluginContext, execContext);
        }
    }

    /**
     * Called after invocation
     * @param {ExecutionContext} execContext the {@link ExecutionContext}
     */
    afterInvocation = (execContext: ExecutionContext) => {
        ThundraLogger.debug('<Invocation> After invocation of transaction', execContext.transactionId);

        const { executor } = this.pluginContext;

        if (executor) {
            executor.finishInvocation(this.pluginContext, execContext);
        }

        const { invocationData } = execContext;
        const { apiKey } = this.pluginContext;
        const invocation = Utils.generateReport(invocationData, apiKey);

        const sampler = get(this.options, 'sampler', { isSampled: () => true });
        const sampled = sampler.isSampled(invocation);

        ThundraLogger.debug('<Invocation> Checked sampling of transaction', execContext.transactionId, ':', sampled);

        if (sampled) {
            execContext.report(invocation);
        } else {
            ThundraLogger.debug(
                '<Invocation> Reporting disabled due to existing sampler for transaction', execContext.transactionId);
            execContext.reportingDisabled = true;
        }
    }

    /**
     * Destroys plugin
     */
    destroy(): void {
        // pass
    }

}
