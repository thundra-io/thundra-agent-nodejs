import { SpanTags } from '../dist/Constants';

const clearEnvironmentVariables = () => {
    for (const key of Object.keys(process.env)) {
        if (key.toUpperCase().startsWith('THUNDRA_')) {
            delete process.env[key];
        }
    }
};

const createMockSpan = (tracer, opt) => {
    const span = tracer.startSpan(opt.operationName);    
    span.className = opt.className;
    span.setTag(SpanTags.OPERATION_TYPE, opt.operationType);
    span.startTime = 0;
    span.finishTime = opt.duration;
    span.setTag(SpanTags.TOPOLOGY_VERTEX, opt.vertex);
    span.setTag('error', opt.error);
    span.setTag('error.kind', opt.errorKind);

    return span;
};

module.exports = {
    clearEnvironmentVariables,
    createMockSpan,
};
