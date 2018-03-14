import ThundraWrapper from "./src/thundra-wrapper";
import Tracer from "./src/plugins/tracer";

module.exports = (config) => {
    let apiKey, plugins;
    if (config) {
        apiKey = config.apiKey;
        plugins = config.plugins;
    }
    plugins = plugins instanceof Array ? [...plugins, Tracer()] : [Tracer()];
    apiKey = process.env.thundra_apiKey ? process.env.thundra_apiKey : apiKey;
    return originalFunc => {
        return (originalEvent, originalContext, originalCallback) => {
            const originalThis = this;
            const thundraWrapper = new ThundraWrapper(
                originalThis,
                originalEvent,
                originalContext,
                originalCallback,
                originalFunc,
                plugins,
                apiKey
            );
            return thundraWrapper.invoke();
        };
    };
};

