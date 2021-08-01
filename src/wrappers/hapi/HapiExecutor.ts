import Utils from '../../utils/Utils';
import { HttpTags, TriggerHeaderTags, SpanTags } from '../../Constants';
import PluginContext from '../../plugins/PluginContext';
import ExecutionContext from '../../context/ExecutionContext';
import WrapperUtils from '../WebWrapperUtils';
import ConfigProvider from '../../config/ConfigProvider';
import ConfigNames from '../../config/ConfigNames';
import InvocationSupport from '../../plugins/support/InvocationSupport';

export function startInvocation(pluginContext: PluginContext, execContext: any) {
    execContext.invocationData = WrapperUtils.createInvocationData(execContext, pluginContext);
}

export function finishInvocation(pluginContext: PluginContext, execContext: any) {
    WrapperUtils.finishInvocationData(execContext, pluginContext);
}

export function startTrace(pluginContext: PluginContext, execContext: ExecutionContext) {

    WrapperUtils.startTrace(pluginContext, execContext);

    const {
        request,
        rootSpan,
    } = execContext;

    const resourceName = request.route.path;
    const triggerOperationName = request.hostname + resourceName;

    execContext.triggerOperationName = triggerOperationName;
    execContext.applicationResourceName = resourceName;

    // Change root span name and response header
    rootSpan.operationName = resourceName;
    InvocationSupport.setAgentTag(SpanTags.TRIGGER_OPERATION_NAMES, [triggerOperationName]);
    // Put initial root span tags
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

    if (!ConfigProvider.get<boolean>(ConfigNames.THUNDRA_TRACE_REQUEST_SKIP)) {
        rootSpan.tags[HttpTags.BODY] = request.payload || {};
    }
}

export function finishTrace(pluginContext: PluginContext, execContext: ExecutionContext) {
    WrapperUtils.finishTrace(pluginContext, execContext);

    const {
        rootSpan,
        response,
        request,
        triggerOperationName,
    } = execContext;

    let statusCode: Number;

    if (response) {
        if (!response.isBoom) {
            response.header(TriggerHeaderTags.RESOURCE_NAME, triggerOperationName);
            statusCode = response.statusCode;
        } else {
            if (response.output) {
                const headers = response.output.headers;
                if (headers) {
                    response.output.headers = {
                        ...headers,
                        ...{ [TriggerHeaderTags.RESOURCE_NAME]: triggerOperationName },
                    };
                }

                statusCode = response.output.statusCode;
            }
        }
    }

    InvocationSupport.setAgentTag(HttpTags.HTTP_STATUS, statusCode);
    Utils.copyProperties(request.route, ['path'], rootSpan.tags, [HttpTags.HTTP_ROUTE_PATH]);
    rootSpan.tags[HttpTags.HTTP_STATUS] = statusCode;
}
