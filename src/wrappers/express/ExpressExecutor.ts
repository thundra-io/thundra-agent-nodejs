import Utils from '../../utils/Utils';
import { HttpTags, TriggerHeaderTags } from '../../Constants';
import PluginContext from '../../plugins/PluginContext';
import ExecutionContext from '../../context/ExecutionContext';
import WrapperUtils from '../WebWrapperUtils';
import ConfigProvider from '../../config/ConfigProvider';
import ConfigNames from '../../config/ConfigNames';

export function startInvocation(pluginContext: PluginContext, execContext: any) {
    execContext.invocationData = WrapperUtils.createInvocationData(execContext, pluginContext);
}

export function finishInvocation(pluginContext: PluginContext, execContext: any) {
    WrapperUtils.finishInvocationData(execContext, pluginContext);
}

export function startTrace(pluginContext: PluginContext, execContext: ExecutionContext) {
    const { request } = execContext;
    WrapperUtils.startTrace(pluginContext, execContext);

    const { rootSpan, triggerOperationName, response } = execContext;
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

    if (!ConfigProvider.get<boolean>(ConfigNames.THUNDRA_TRACE_REQUEST_SKIP)) {
        Utils.copyProperties(
            request,
            ['body'],
            rootSpan.tags,
            [HttpTags.BODY],
        );
    }

    if (triggerOperationName) {
        response.set(TriggerHeaderTags.RESOURCE_NAME, triggerOperationName);
    }
}

export function finishTrace(pluginContext: PluginContext, execContext: ExecutionContext) {
    WrapperUtils.finishTrace(pluginContext, execContext);

    const { rootSpan, response, request } = execContext;

    Utils.copyProperties(response, ['statusCode'], rootSpan.tags, [HttpTags.HTTP_STATUS]);
    Utils.copyProperties(request.route, ['path'], rootSpan.tags, [HttpTags.HTTP_ROUTE_PATH]);
}
