import Utils from '../../utils/Utils';
import { GenericWrapperTags } from '../../Constants';
import PluginContext from '../../plugins/PluginContext';
import ExecutionContext from '../../context/ExecutionContext';
import WrapperUtils from '../WebWrapperUtils';

const get = require('lodash.get');

/**
 * Start invocation process
 * @param {PluginContext} pluginContext
 * @param {ExecutionContext} execContext
 */
export function startInvocation(pluginContext: PluginContext, execContext: ExecutionContext) {
    execContext.invocationData = WrapperUtils.createInvocationData(execContext, pluginContext);
}

/**
 * Finish invocation process
 * @param {PluginContext} pluginContext
 * @param {ExecutionContext} execContext
 */
export function finishInvocation(pluginContext: PluginContext, execContext: ExecutionContext) {
    WrapperUtils.finishInvocationData(execContext, pluginContext);
}

/**
 * Start trace
 * @param {PluginContext} pluginContext
 * @param {ExecutionContext} execContext
 */
export function startTrace(pluginContext: PluginContext, execContext: ExecutionContext) {

    const {
        request,
        tracer,
    } = execContext;

    const functionName = get(request, `functionName`);
    const contextInformation: any = execContext.getContextInformation();
    const traceId = Utils.generateId();

    const rootSpan = tracer._startSpan(functionName || get(request, `__THUNDRA_ID__`), {
        domainName: contextInformation.applicationDomainName,
        className: contextInformation.applicationClassName,
        rootTraceId: traceId,
    });

    rootSpan.isRootSpan = true;

    const tags = {
        [GenericWrapperTags.FUNCTION_NAME]: functionName,
    };

    rootSpan.addTags(tags);

    execContext.traceId = traceId;
    execContext.rootSpan = rootSpan;
    execContext.spanId = execContext.rootSpan.spanContext.spanId;
    execContext.rootSpan.startTime = execContext.startTimestamp;
}

/**
 * Finish trace
 * @param {PluginContext} pluginContext
 * @param {ExecutionContext} execContext
 */
export function finishTrace(pluginContext: PluginContext, execContext: ExecutionContext) {
    WrapperUtils.finishTrace(pluginContext, execContext);
}
