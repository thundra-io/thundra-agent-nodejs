const SLSDebugger = require('@thundra/slsdebugger');

let initiated = false;
export const initiate = async () => {
    if (!initiated) {
        SLSDebugger.init();
        initiated = true;
    }
}

export const get = (additionalInfo : { [key: string]: any }) => {
    if (!initiated) {
        initiate();
    }

    return SLSDebugger._getSLSDebuggerInstance(additionalInfo);
}

    