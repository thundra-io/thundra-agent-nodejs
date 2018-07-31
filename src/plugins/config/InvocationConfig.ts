import BasePluginConfig from './BasePluginConfig';

class InvocationConfig extends BasePluginConfig {
    constructor(options: any) {
        options = options ? options : {};
        super(options.enabled);
    }
}

export default InvocationConfig;
