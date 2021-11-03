import PluginContext from '../../plugins/PluginContext';
import ExecutionContext from '../../context/ExecutionContext';
import WrapperUtils from '../WebWrapperUtils';
import Utils from '../../utils/Utils';
import {HttpTags, SpanTags, TriggerHeaderTags} from '../../Constants';
import InvocationSupport from '../../plugins/support/InvocationSupport';
import ConfigProvider from '../../config/ConfigProvider';
import ConfigNames from '../../config/ConfigNames';

export function startInvocation(pluginContext: PluginContext, execContext: any) {
    execContext.invocationData = WrapperUtils.createInvocationData(execContext, pluginContext);
}

export function finishInvocation(pluginContext: PluginContext, execContext: any) {
    WrapperUtils.finishInvocationData(execContext, pluginContext);
}

export function startTrace(pluginContext: PluginContext, execContext: ExecutionContext) {
    WrapperUtils.startTrace(pluginContext, execContext);

    const {rootSpan, request, response} = execContext;

    const resourceName = request.path || '';
    const triggerOperationName = request.hostname + resourceName;

    execContext.triggerOperationName = triggerOperationName;
    execContext.applicationResourceName = resourceName;
    rootSpan.operationName = resourceName;

    Utils.copyProperties(
        request,
        [
            'method',
            'query',
            'hostname',
            'path',
        ],
        rootSpan.tags,
        [
            HttpTags.HTTP_METHOD,
            HttpTags.QUERY_PARAMS,
            HttpTags.HTTP_HOST,
            HttpTags.HTTP_PATH,
        ],
    );

    InvocationSupport.setAgentTag(HttpTags.HTTP_METHOD, request.method);
    InvocationSupport.setAgentTag(SpanTags.TRIGGER_OPERATION_NAMES, [triggerOperationName]);

    if (!ConfigProvider.get<boolean>(ConfigNames.THUNDRA_TRACE_REQUEST_SKIP)) {
        Utils.copyProperties(
            request,
            ['body'],
            rootSpan.tags,
            [HttpTags.BODY],
        );
    }
}

export function finishTrace(pluginContext: PluginContext, execContext: ExecutionContext) {
    WrapperUtils.finishTrace(pluginContext, execContext);

    const {rootSpan, response, request} = execContext;

    if (request._matchedRoute) {
        const resourceName = request._matchedRoute || request.path || '';
        const triggerOperationName = request.hostname + resourceName;

        execContext.triggerOperationName = triggerOperationName;
        execContext.applicationResourceName = resourceName;
        rootSpan.operationName = resourceName;
    }

    InvocationSupport.setAgentTag(HttpTags.HTTP_STATUS, response.statusCode);
    Utils.copyProperties(response, ['status'], rootSpan.tags, [HttpTags.HTTP_STATUS]);
    Utils.copyProperties(request, ['path'], rootSpan.tags, [HttpTags.HTTP_ROUTE_PATH]);

    if (execContext.triggerOperationName) {

        response.set(TriggerHeaderTags.RESOURCE_NAME, execContext.triggerOperationName);
    }
}
