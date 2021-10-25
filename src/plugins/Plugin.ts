import ExecutionContext from '../context/ExecutionContext';
import PluginContext from './PluginContext';

/**
 * Interface for plugin implementations such as
 * {@code Trace}, {@code Invocation}, {@code Metric} and {@code Log}.
 */
interface Plugin {

    /**
     * Gets the name of the plugin.
     * @return {string} name of the plugin
     */
    getName(): string;

    /**
     * Sets the the {@link PluginContext}
     * @param {PluginContext} pluginContext the {@link PluginContext}
     */
    setPluginContext(pluginContext: PluginContext): void;

    /**
     * Called before invocation
     * @param {ExecutionContext} execContext the {@link ExecutionContext}
     */
    beforeInvocation(execContext: ExecutionContext): void;
    /**
     * Called after invocation
     * @param {ExecutionContext} execContext the {@link ExecutionContext}
     */
    afterInvocation(execContext: ExecutionContext): void;

    /**
     * Destroys plugin
     */
    destroy(): void;

}

export default Plugin;
