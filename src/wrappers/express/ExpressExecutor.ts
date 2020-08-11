import Utils from '../../utils/Utils';
import { HttpTags } from '../../Constants';
import PluginContext from '../../plugins/PluginContext';
import ExecutionContext from '../../context/ExecutionContext';
import WrapperUtils from '../WrapperUtils';

export function startInvocation(pluginContext: PluginContext, execContext: any) {
    execContext.invocationData = WrapperUtils.createInvocationData(execContext, pluginContext);
}

export function finishInvocation(pluginContext: PluginContext, execContext: any) {
    WrapperUtils.finishInvocationData(execContext, pluginContext);
}

export function startTrace(pluginContext: PluginContext, execContext: ExecutionContext) {
    const { request } = execContext;
    WrapperUtils.startTrace(pluginContext, execContext);

    const { rootSpan } = execContext;
    // Put initial root span tags
    Utils.copyProperties(
        request,
        [
            'method',
            'query',
            'hostname',
            'path',
            'body',
        ],
        rootSpan.tags,
        [
            HttpTags.HTTP_METHOD,
            HttpTags.QUERY_PARAMS,
            HttpTags.HTTP_HOST,
            HttpTags.HTTP_PATH,
            HttpTags.BODY,
        ],
    );
}

export function finishTrace(pluginContext: PluginContext, execContext: ExecutionContext) {
    WrapperUtils.finishTrace(pluginContext, execContext);

    const { rootSpan, response } = execContext;

    Utils.copyProperties(response, ['statusCode'], rootSpan.tags, [HttpTags.HTTP_STATUS]);

}
