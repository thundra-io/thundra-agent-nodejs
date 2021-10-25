import Reporter from '../Reporter';
import PluginContext from '../plugins/PluginContext';
import Plugin from '../plugins/Plugin';

/**
 * Wrapper context
 * Includes necessery objects for wrapper process
 */
export default class WrapperContext {

    private static IGNORED_PLUGIN_SET = new Set();

    reporter: Reporter;
    pluginContext: PluginContext;
    plugins: Plugin[];

    constructor(
        reporter: Reporter,
        pluginContext: PluginContext,
        plugins: Plugin[],
    ) {
        this.reporter = reporter;
        this.pluginContext = pluginContext;
        this.plugins = this.getAllowedPlugins(plugins);
    }

    static addIgnoredPlugin(pluginType: string) {
        WrapperContext.IGNORED_PLUGIN_SET.add(pluginType);
    }

    /**
     * Gets the plugin by its name.
     *
     * @param pluginName name of the plugin
     * @return {Plugin} the {@link Plugin plugin} or {@code null}
     */
    public getPlugin<P extends Plugin>(pluginName: string): P | null {
        for (const plugin of this.plugins) {
            if (plugin.getName() === pluginName) {
                return plugin as P;
            }
        }
        return null;
    }

    private getAllowedPlugins(plugins: any[]): any[] {
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
