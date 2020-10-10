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
    const { request } = execContext;

    setupRoutePathHandler(execContext);

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

function handleRoutePath(context: ExecutionContext, resourceName: string) {
    const { rootSpan, request, response } = context;

    const triggerOperationName = request.hostname + resourceName;
    context.triggerOperationName = triggerOperationName;
    context.applicationResourceName = resourceName;

    // Change root span name and response header
    rootSpan.operationName = resourceName;
    response.set(TriggerHeaderTags.RESOURCE_NAME, triggerOperationName);
    InvocationSupport.setAgentTag(SpanTags.TRIGGER_OPERATION_NAMES, [triggerOperationName]);
}

function setupRoutePathHandler(execContext: ExecutionContext) {
    const { request } = execContext;

    if (!request.route) {
        Object.defineProperty(request, 'route', {
            get() {
                return request._route;
            },
            set(newValue) {
                request._route = newValue;
                if (request._route) {
                    const mergedPath = mergePathAndRoute(request.originalUrl, request._route.path);
                    handleRoutePath(execContext, mergedPath);
                }
            },
        });
    } else {
        handleRoutePath(execContext, request.route.path);
    }
}

export function mergePathAndRoute(path: string, route: string) {
    if (path.indexOf('?') > -1) {
        path = path.substring(0, path.indexOf('?'));
    }

    const routeSCount = route.split('/').length - 1;
    const onlySlash = route === '/';

    let normalizedPath;

    if (!onlySlash) {
        for (let i = 0; i < routeSCount; i++) {
            path = path.substring(0, path.lastIndexOf('/'));
        }
        normalizedPath = path + route;
    } else {
        const depth = ConfigProvider.get<number>(ConfigNames.THUNDRA_TRACE_INTEGRATIONS_HTTP_URL_DEPTH);
        normalizedPath = Utils.getNormalizedPath(path, depth);
    }

    return normalizedPath;
}
