import Utils from '../../../utils/Utils';
import { HttpTags, TriggerHeaderTags, SpanTags, SpanTypes, GooglePubSubTags } from '../../../Constants';
import PluginContext from '../../../plugins/PluginContext';
import ExecutionContext from '../../../context/ExecutionContext';
import WrapperUtils from '../../WebWrapperUtils';
import ConfigProvider from '../../../config/ConfigProvider';
import ConfigNames from '../../../config/ConfigNames';
import InvocationSupport from '../../../plugins/support/InvocationSupport';
import WebWrapperUtils from '../../WebWrapperUtils';
import * as opentracing from 'opentracing';
import ThundraSpanContext from '../../../opentracing/SpanContext';
import InvocationTraceSupport from '../../../plugins/support/InvocationTraceSupport';
import { ClassNames, DomainNames } from '../../../Constants';

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
        tracer,
        request,
    } = execContext;

    const contextInformation: any = execContext.getContextInformation();

    const propagatedSpanContext: ThundraSpanContext =
        tracer.extract(opentracing.FORMAT_TEXT_MAP, request.attributes) as ThundraSpanContext;

    const triggerOperationName = get(request, `attributes.${TriggerHeaderTags.RESOURCE_NAME}`)
        || contextInformation.operationName;
    const traceId = get(propagatedSpanContext, 'traceId') || Utils.generateId();
    const incomingSpanID = get(propagatedSpanContext, 'spanId');

    const rootSpan = tracer._startSpan(triggerOperationName, {
        propagated: propagatedSpanContext ? true : false,
        parentContext: propagatedSpanContext,
        rootTraceId: traceId,
        domainName: contextInformation.applicationDomainName,
        className: contextInformation.applicationClassName,
    });

    rootSpan.isRootSpan = true;

    const subscription = request._subscriber._subscription;
    const topic = (subscription.metadata && subscription.metadata.topic)
        ? subscription.metadata.topic : subscription.name;

    const tags = {
      [GooglePubSubTags.PROJECT_ID]: subscription.pubsub.projectId,
      [GooglePubSubTags.TOPIC_NAME]: topic,
      [GooglePubSubTags.KIND]: 'Consumer',
      [SpanTags.SPAN_TYPE]: SpanTypes.GOOGLEPUBSUB,
    };

    rootSpan.addTags(tags);

    InvocationSupport.setAgentTag(SpanTags.TRIGGER_OPERATION_NAMES, [triggerOperationName]);
    InvocationSupport.setAgentTag(SpanTags.TRIGGER_DOMAIN_NAME, DomainNames.API);
    InvocationSupport.setAgentTag(SpanTags.TRIGGER_CLASS_NAME, ClassNames.GOOGLEPUBSUB);

    if (incomingSpanID) {
        InvocationTraceSupport.addIncomingTraceLink(incomingSpanID);
    }

    execContext.traceId = traceId;
    execContext.rootSpan = rootSpan;
    execContext.spanId = execContext.rootSpan.spanContext.spanId;
    execContext.rootSpan.startTime = execContext.startTimestamp;
    execContext.triggerOperationName = triggerOperationName;
}

/**
 * Finish trace
 * @param {PluginContext} pluginContext
 * @param {ExecutionContext} execContext
 */
export function finishTrace(pluginContext: PluginContext, execContext: ExecutionContext) {
    WrapperUtils.finishTrace(pluginContext, execContext);

    const { rootSpan, request } = execContext;
    rootSpan.tags['pubsub.ack'] = request._handled ? 1 : 0;
}
