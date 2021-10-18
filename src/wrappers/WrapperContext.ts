
import Reporter from '../Reporter';
import PluginContext from '../plugins/PluginContext';

/**
 * Wrapper context
 * Includes necessery objects for wrapper process
 */
export default class WrapperContext {

    private static IGNORED_PLUGIN_SET = new Set();

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
        this.plugins = this.getAllowedPlugins(plugins);
    }

    static addIgnoredPlugin(pluginType: string) {

        WrapperContext.IGNORED_PLUGIN_SET.add(pluginType);
    }

    protected getAllowedPlugins(plugins: any[]): any[] {

        const resultPlugins: any[] = [];

        for (let i = 0; i < plugins.length; i++) {

            const pluginType = plugins[i].constructor.name;

            WrapperContext.IGNORED_PLUGIN_SET.has(pluginType)
                ? delete plugins[i]
                : resultPlugins.push(plugins[i]);
        }

        return resultPlugins;
    }
}
