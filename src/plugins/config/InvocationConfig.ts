import BasePluginConfig from './BasePluginConfig';

class InvocationConfig extends BasePluginConfig {
    constructor(options: any) {
        options = options ? options : {};
        super(true);
    }
}

export default InvocationConfig;
