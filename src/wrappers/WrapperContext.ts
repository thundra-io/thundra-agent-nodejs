
import Reporter from '../Reporter';
import PluginContext from '../plugins/PluginContext';

/**
 * Wrapper context
 * Includes necessery objects for wrapper process
 */
export default class WrapperContext {
    reporter: Reporter;
    pluginContext: PluginContext;
    plugins: any[];

    constructor(
        reporter: Reporter,
        pluginContext: PluginContext,
        plugins: any[],
    ) {
        this.reporter = reporter;
        this.pluginContext = pluginContext;
        this.plugins = plugins;
    }
}
