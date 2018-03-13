import ThundraWrapper from "./src/thundra-wrapper"
import Tracer from "./src/plugins/tracer"

module.exports = (config) => {
    let {apiKey} = config;
    let plugins = [Tracer()];
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

