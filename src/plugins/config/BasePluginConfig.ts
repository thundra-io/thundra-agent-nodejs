/**
 * Base class for plugin configurations
 */
class BasePluginConfig {

    enabled: boolean;

    constructor(enabled: boolean) {
        this.enabled = enabled;
    }

}

export default BasePluginConfig;
