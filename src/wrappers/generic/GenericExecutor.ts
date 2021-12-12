import Utils from '../../utils/Utils';
import {
    ClassNames,
    DomainNames,
    GenericWrapperTags,
    SpanTags,
    SpanTypes,
} from '../../Constants';
import PluginContext from '../../plugins/PluginContext';
import ExecutionContext from '../../context/ExecutionContext';
import WrapperUtils from '../WebWrapperUtils';
import InvocationSupport from '../../plugins/support/InvocationSupport';
import GooglePubSubUtils from '../../utils/GooglePubSubUtils';

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

    const rootSpan = tracer._startSpan(functionName, {
        propagated: false,
        rootTraceId: Utils.generateId(),
        domainName: contextInformation.applicationDomainName,
        className: contextInformation.applicationClassName,
    });

    rootSpan.isRootSpan = true;

    const tags = {
        [GenericWrapperTags.Function_Name]: functionName,
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
