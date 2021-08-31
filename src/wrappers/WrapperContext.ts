
import Reporter from '../Reporter';
import PluginContext from '../plugins/PluginContext';

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
