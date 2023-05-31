import InvocationPlugin from '../plugins/Invocation';
import TracePlugin from '../plugins/Trace';
import LogPlugin from '../plugins/Log';
import ExecutionContextManager from '../context/ExecutionContextManager';
import Reporter from '../Reporter';
import ThundraLogger from '../ThundraLogger';
import PluginContext from '../plugins/PluginContext';
import ConfigProvider from '../config/ConfigProvider';
import ThundraConfig from '../plugins/config/ThundraConfig';
import ConfigNames from '../config/ConfigNames';
import ExecutionContext from '../context/ExecutionContext';
import Utils from '../utils/Utils';
import ThundraTracer from '../opentracing/Tracer';
import * as asyncContextProvider from '../context/asyncContextProvider';
import * as opentracing from 'opentracing';
import MonitoringDataType from '../plugins/data/base/MonitoringDataType';
import InvocationData from '../plugins/data/invocation/InvocationData';
import InvocationSupport from '../plugins/support/InvocationSupport';
import InvocationTraceSupport from '../plugins/support/InvocationTraceSupport';
import {
    DEFAULT_APPLICATION_NAME,
    HttpTags,
    SpanTags,
    TriggerHeaderTags,
    HTTPHeaders,
    TraceHeaderTags,
    CatchpointProperties,
    CatchpointHeaders,
    CatchpointTags,
} from '../Constants';
import ThundraSpanContext from '../opentracing/SpanContext';
import { ApplicationInfo } from '../application/ApplicationInfo';
import HttpError from '../error/HttpError';
import WrapperContext from './WrapperContext';
import ThundraSpan from '../opentracing/Span';
import Resource from '../plugins/data/invocation/Resource';
import SpanData from '../plugins/data/trace/SpanData';

const get = require('lodash.get');

export default class WebWrapperUtils {

    static initWrapper(executor: any) {
        const config = ConfigProvider.thundraConfig;
        const { apiKey } = config;

        const reporter = WebWrapperUtils.createReporter(apiKey);
        const pluginContext = WebWrapperUtils.createPluginContext(apiKey, executor);
        const plugins = WebWrapperUtils.createPlugins(config, pluginContext);

        return new WrapperContext(reporter, pluginContext, plugins);
    }

    static getDefaultApplicationId(appInfo: ApplicationInfo) {
        return WebWrapperUtils.createApplicationId(
            appInfo.applicationClassName,
            appInfo.applicationRegion,
            appInfo.applicationName,
        );
    }

    static createApplicationId(
        applicationClassName: string,
        applicationRegion: string,
        applicationName: string,
        ) {
            return `node:${applicationClassName}:${applicationRegion}:${applicationName}`;
    }

    static async beforeRequest(request: any, response: any, plugins: any[]) {
        const context = ExecutionContextManager.get();

        // Put current request into the execution context
        context.request = request;
        context.response = response;

        for (const plugin of plugins) {
            await plugin.beforeInvocation(context);
        }
    }

    static async afterRequest(request: any, response: any, plugins: any[], reporter: Reporter) {
        const context = ExecutionContextManager.get();

        if (!context.error && response.statusCode >= 500) {
            context.error = new HttpError(`Returned with status code ${response.statusCode}.`);
        }

        context.finishTimestamp = Date.now();

        let reports: any = [];

        // Clear reports first
        context.reports = [];
        try {
            // Run plugins and let them to generate reports
            for (let i = plugins.length - 1; i >= 0; i--) {
                const plugin = plugins[i];
                await plugin.afterInvocation(context);
            }
            reports = context.reports;
        } finally {
            // Make sure generated reports are cleared
            context.reports = [];
        }

        if (!context.reportingDisabled) {
            try {
                await reporter.sendReports(reports);
            } catch (err) {
                ThundraLogger.error('<WebWrapperUtils> Error occurred while reporting:', err);
            }
        } else {
            ThundraLogger.debug('<WebWrapperUtils> Skipped reporting as reporting is disabled');
        }
    }

    static createPlugins(config: ThundraConfig, pluginContext: PluginContext): any[] {
        const plugins: any[] = [];
        if (config.disableMonitoring) {
            return plugins;
        }

        if (!ConfigProvider.get<boolean>(ConfigNames.THUNDRA_TRACE_DISABLE) && config.traceConfig.enabled) {
            const tracePlugin = new TracePlugin(config.traceConfig);
            plugins.push(tracePlugin);
        }

        const invocationPlugin = new InvocationPlugin(config.invocationConfig);
        plugins.push(invocationPlugin);

        if (!ConfigProvider.get<boolean>(ConfigNames.THUNDRA_LOG_DISABLE) && config.logConfig.enabled) {
            plugins.push(new LogPlugin(config.logConfig));
        }

        // Set plugin context for plugins
        plugins.forEach((plugin: any) => { plugin.setPluginContext(pluginContext); });

        return plugins;
    }

    static createPluginContext(apiKey: string, executor: any): PluginContext {
        return new PluginContext({
            apiKey,
            executor,
        });
    }

    static createReporter(apiKey: string): Reporter {
        return new Reporter(apiKey);
    }

    static initAsyncContextManager() {
        ExecutionContextManager.setProvider(asyncContextProvider);
        ExecutionContextManager.init();
    }

    static createExecContext(
        applicationClassName?: string,
        applicationDomainName?: string,
    ): ExecutionContext {
        const { thundraConfig } = ConfigProvider;
        const tracerConfig = get(thundraConfig, 'traceConfig.tracerConfig', {});

        const tracer = new ThundraTracer(tracerConfig);
        const transactionId = Utils.generateId();

        tracer.setTransactionId(transactionId);

        const startTimestamp = Date.now();
        const appInfoFromConfig = Utils.getAppInfoFromConfig();
        return new ExecutionContext({
            applicationInfo: {
                applicationId: WebWrapperUtils.createApplicationId(
                    applicationClassName,
                    appInfoFromConfig.applicationRegion || '',
                    appInfoFromConfig.applicationName || DEFAULT_APPLICATION_NAME,
                ),
                applicationClassName,
                applicationDomainName,
            },
            tracer,
            transactionId,
            startTimestamp,
        });
    }

    static createInvocationData(execContext: ExecutionContext, pluginContext: PluginContext): InvocationData {
        const invocationData = Utils.initMonitoringData(pluginContext,
            MonitoringDataType.INVOCATION) as InvocationData;

        invocationData.applicationPlatform = '';
        invocationData.applicationRegion = execContext.getApplicationInfo().applicationRegion;
        invocationData.tags = {};
        invocationData.userTags = {};
        invocationData.startTimestamp = execContext.startTimestamp;
        invocationData.finishTimestamp = 0;
        invocationData.duration = 0;
        invocationData.erroneous = false;
        invocationData.errorType = '';
        invocationData.errorMessage = '';
        invocationData.coldStart = false;
        invocationData.timeout = false;

        invocationData.traceId = execContext.traceId;
        invocationData.transactionId = execContext.transactionId;
        invocationData.spanId = execContext.spanId;

        return invocationData;
    }

    static finishInvocationData(execContext: ExecutionContext, pluginContext: PluginContext) {
        const { error, invocationData, applicationResourceName } = execContext;

        if (error) {
            const parsedErr = Utils.parseError(error);
            invocationData.setError(parsedErr);
            invocationData.tags.error = true;
            invocationData.tags['error.message'] = parsedErr.errorMessage;
            invocationData.tags['error.kind'] = parsedErr.errorType;
            invocationData.tags['error.stack'] = parsedErr.stack;
            if (parsedErr.code) {
                invocationData.tags['error.code'] = error.code;
            }
            if (parsedErr.stack) {
                invocationData.tags['error.stack'] = error.stack;
            }
        }

        invocationData.setTags(InvocationSupport.getAgentTags());
        invocationData.setUserTags(InvocationSupport.getTags());

        const { startTimestamp, finishTimestamp, spanId, response } = execContext;

        // Finish invocation if it is not finished yet
        invocationData.finish(finishTimestamp);

        invocationData.resources = InvocationTraceSupport.getResources(spanId);
        invocationData.incomingTraceLinks = InvocationTraceSupport.getIncomingTraceLinks();
        invocationData.outgoingTraceLinks = InvocationTraceSupport.getOutgoingTraceLinks();
        invocationData.applicationResourceName = applicationResourceName;

        if (Utils.isValidHTTPResponse(response)) {
            invocationData.setUserTags({ [HttpTags.HTTP_STATUS]: response.statusCode });
        }
    }

    static startTrace(pluginContext: PluginContext, execContext: ExecutionContext) {
        const {
            tracer,
            request,
        } = execContext;

        const propagatedSpanContext: ThundraSpanContext =
            tracer.extract(opentracing.FORMAT_HTTP_HEADERS, request.headers) as ThundraSpanContext;

        const depth = ConfigProvider.get<number>(ConfigNames.THUNDRA_TRACE_INTEGRATIONS_HTTP_URL_DEPTH);
        const normalizedPath = Utils.getNormalizedPath(request.path, depth);
        const triggerOperationName = get(request, `headers.${TriggerHeaderTags.RESOURCE_NAME}`)
            || request.hostname + normalizedPath;
        const traceId = get(propagatedSpanContext, 'traceId') || Utils.generateId();
        const incomingSpanID = get(propagatedSpanContext, 'spanId');

        const rootSpan = tracer._startSpan(normalizedPath, {
            propagated: propagatedSpanContext ? true : false,
            parentContext: propagatedSpanContext,
            rootTraceId: traceId,
            domainName: execContext.getApplicationInfo().applicationDomainName,
            className: execContext.getApplicationInfo().applicationClassName,
        });
        rootSpan.isRootSpan = true;

        InvocationSupport.setAgentTag(SpanTags.TRIGGER_OPERATION_NAMES, [triggerOperationName]);
        InvocationSupport.setAgentTag(SpanTags.TRIGGER_DOMAIN_NAME, 'API');
        InvocationSupport.setAgentTag(SpanTags.TRIGGER_CLASS_NAME, 'HTTP');

        if (incomingSpanID) {
            InvocationTraceSupport.addIncomingTraceLink(incomingSpanID);
        }

        execContext.traceId = traceId;
        execContext.rootSpan = rootSpan;
        execContext.spanId = execContext.rootSpan.spanContext.spanId;
        execContext.rootSpan.startTime = execContext.startTimestamp;
        execContext.triggerOperationName = triggerOperationName;
        execContext.applicationResourceName = normalizedPath;
    }

    static finishTrace(pluginContext: PluginContext, execContext: ExecutionContext) {
        const { error, rootSpan, finishTimestamp } = execContext;

        if (error) {
            rootSpan.setErrorTag(error);
        }

        // If root span is already finished, it won't have any effect
        rootSpan.finish(finishTimestamp);

        WebWrapperUtils.onFinish(
            pluginContext, execContext,
            execContext.request, execContext.response, rootSpan);
    }

    static mergePathAndRoute(path: string, route: string) {
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

    private static onFinish(pluginContext: PluginContext, execContext: ExecutionContext,
                            request: any, response: any, span: ThundraSpan): void {
        if (WebWrapperUtils.isTriggeredFromCatchpoint(request, response)) {
            WebWrapperUtils.onCatchpointRequestFinish(pluginContext, execContext, request, response, span);
        }
    }

    //////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

    private static isTriggeredFromCatchpoint(request: any, response: any): boolean {
        const userAgent: string = request.headers && request.headers[HTTPHeaders.USER_AGENT.toLowerCase()];
        return userAgent && userAgent.includes('Catchpoint');
    }

    private static getCatchpointApplicationInfo(request: any, appName: string, appRegion: string): ApplicationInfo {
        const appId: string = CatchpointProperties.APP_ID_TEMPLATE.
                replace(CatchpointProperties.APP_NAME_PLACEHOLDER, appName).
                replace(CatchpointProperties.APP_REGION_PLACEHOLDER, appRegion);
        return {
            applicationId: appId,
            applicationInstanceId: Utils.generateIdFrom(appId),
            applicationName: appName,
            applicationClassName: CatchpointProperties.APP_CLASS_NAME,
            applicationDomainName: CatchpointProperties.APP_DOMAIN_NAME,
            applicationRegion: appRegion,
            applicationVersion: '',
            applicationRuntime: undefined,
            applicationRuntimeVersion: undefined,
            applicationStage: '',
            applicationTags: {},
        };
    }

    private static getCatchpointRequestResource(execContext: ExecutionContext,
                                                request: any, span: ThundraSpan, duration: number, error: any): Resource {
        return new Resource({
            resourceType: CatchpointProperties.HTTP_REQUEST_CLASS_NAME,
            resourceName: execContext.triggerOperationName || span.operationName,
            resourceOperation: request.method,
            resourceCount: 1,
            resourceErrorCount: error ? 1 : 0,
            resourceErrors: error ? [error.errorType] : undefined,
            resourceDuration: duration,
            resourceMaxDuration: duration,
            resourceAvgDuration: duration,
        });
    }

    private static generateCatchpointAppName(regionName: string, countryName: string, cityName: string): string {
        return cityName || countryName || regionName || DEFAULT_APPLICATION_NAME;
    }

    private static createCatchpointRequestInvocation(execContext: ExecutionContext, applicationInfo: ApplicationInfo,
                                                     regionName: string, countryName: string, cityName: string, testId: string,
                                                     traceId: string, transactionId: string, spanId: string,
                                                     startTimestamp: number, finishTimestamp: number,
                                                     resource: Resource, error: any): InvocationData {
        const invocationData: InvocationData = new InvocationData();

        Utils.injectCommonApplicationProperties(invocationData, applicationInfo);

        invocationData.id = Utils.generateId();
        invocationData.agentVersion = CatchpointProperties.AGENT_VERSION;
        invocationData.traceId = traceId;
        invocationData.transactionId = transactionId;
        invocationData.spanId = spanId;
        invocationData.applicationRegion = regionName || '';
        invocationData.tags = {
            [CatchpointTags.REGION_NAME]: regionName,
            [CatchpointTags.COUNTRY_NAME]: countryName,
            [CatchpointTags.CITY_NAME]: cityName,
            [CatchpointTags.TEST_ID]: testId,
        };
        invocationData.resources = [
            resource,
        ];
        invocationData.userTags = {};
        invocationData.startTimestamp = startTimestamp;
        invocationData.finishTimestamp = finishTimestamp;
        invocationData.duration = finishTimestamp - startTimestamp;
        invocationData.applicationPlatform = '';
        invocationData.erroneous = error ? true : false;
        invocationData.errorType = error ? (error.errorType || '') : '';
        invocationData.errorMessage = error ? (error.errorMessage || '') : '';
        invocationData.coldStart = false;
        invocationData.timeout = false;
        invocationData.incomingTraceLinks = [];
        invocationData.outgoingTraceLinks = [];

        return invocationData;
    }

    private static createCatchpointRequestSpan(execContext: ExecutionContext,
                                               applicationInfo: ApplicationInfo, rootSpan: ThundraSpan, resource: Resource,
                                               regionName: string, countryName: string, cityName: string, testId: string,
                                               traceId: string, transactionId: string, spanId: string,
                                               startTimestamp: number, finishTimestamp: number): SpanData {
        const spanData: SpanData = new SpanData();

        Utils.injectCommonApplicationProperties(spanData, applicationInfo);

        spanData.id = spanId;
        spanData.domainName = CatchpointProperties.HTTP_REQUEST_DOMAIN_NAME;
        spanData.className = CatchpointProperties.HTTP_REQUEST_CLASS_NAME;
        spanData.serviceName = applicationInfo.applicationName;
        spanData.transactionId = transactionId;
        spanData.traceId = traceId;
        spanData.spanOrder = 0;
        spanData.operationName = resource.resourceName;
        spanData.startTimestamp = startTimestamp;
        spanData.finishTimestamp = finishTimestamp;
        spanData.duration = finishTimestamp - startTimestamp;
        spanData.tags = {
            [HttpTags.HTTP_URL]: rootSpan.tags[HttpTags.HTTP_URL],
            [HttpTags.HTTP_HOST]: rootSpan.tags[HttpTags.HTTP_HOST],
            [HttpTags.HTTP_PATH]: rootSpan.tags[HttpTags.HTTP_PATH],
            [HttpTags.HTTP_METHOD]: rootSpan.tags[HttpTags.HTTP_METHOD],
            [HttpTags.QUERY_PARAMS]: rootSpan.tags[HttpTags.QUERY_PARAMS],
            [HttpTags.HTTP_STATUS]: rootSpan.tags[HttpTags.HTTP_STATUS],
            [CatchpointTags.REGION_NAME]: regionName,
            [CatchpointTags.COUNTRY_NAME]: countryName,
            [CatchpointTags.CITY_NAME]: cityName,
            [CatchpointTags.TEST_ID]: testId,
        };

        return spanData;
    }

    private static onCatchpointRequestFinish(pluginContext: PluginContext, execContext: ExecutionContext,
                                             request: any, response: any, span: ThundraSpan): void {
        const spanContext: ThundraSpanContext = span.context() as ThundraSpanContext;

        const headers: any = request.headers || {};

        const regionName: string = headers[CatchpointHeaders.REGION_NAME];
        const countryName: string = headers[CatchpointHeaders.COUNTRY_NAME];
        const cityName: string = headers[CatchpointHeaders.CITY_NAME];
        const testId: string = headers[CatchpointHeaders.TEST_ID];
        const time: string = headers[CatchpointHeaders.TIME];

        const appName: string = WebWrapperUtils.generateCatchpointAppName(regionName, countryName, cityName);
        const appRegion = regionName || '';
        const startTime: number = span.startTime;
        // TODO Handle time header to calculate start time more accurately
        /*
        if (time) {
            try {
                // Parse time in "yyyyMMddHHmmssSSS" format
                startTime = parseTime(time);
                if (startTime > span.finishTime
                        || (startTime < span.startTime - CatchpointProperties.TIME_MAX_DIFF)) {
                    startTime = span.startTime;
                    ThundraLogger.debug(`<WebWrapperUtils> Invalid Catchpoint time: ${time}`);
                }
            } catch (error) {
                ThundraLogger.debug(`<WebWrapperUtils> Unable to parse Catchpoint time: ${time}`, err);
            }
        }
        */
        const traceId: string = spanContext.traceId;
        const transactionId: string = Utils.generateId();
        const spanId: string  = Utils.generateId();
        const startTimestamp: number = startTime;
        const finishTimestamp: number = span.finishTime;
        const duration: number = finishTimestamp - startTimestamp;
        const applicationInfo: ApplicationInfo = WebWrapperUtils.getCatchpointApplicationInfo(request, appName, appRegion);
        const error = execContext.error ? Utils.parseError(execContext.error) : undefined;

        const resource: Resource =
            WebWrapperUtils.getCatchpointRequestResource(
                execContext, request, span, duration, error);
        const catchpointInvocationData: InvocationData =
            WebWrapperUtils.createCatchpointRequestInvocation(
                execContext, applicationInfo,
                regionName, countryName, cityName, testId,
                traceId, transactionId, spanId,
                startTimestamp, finishTimestamp,
                resource, error);

        const catchpointInvocation =
            Utils.generateReport(catchpointInvocationData, pluginContext.apiKey);
        execContext.report(catchpointInvocation);

        const catchpointSpanData: SpanData =
            WebWrapperUtils.createCatchpointRequestSpan(
                execContext, applicationInfo, span, resource,
                regionName, countryName, cityName, testId,
                traceId, transactionId, spanId,
                startTimestamp, finishTimestamp);
        const catchpointSpan =
            Utils.generateReport(catchpointSpanData, pluginContext.apiKey);
        execContext.report(catchpointSpan);

        response.headers = response.headers || {};
        response.headers[TraceHeaderTags.TRACE_ID] = spanContext.traceId;
    }

}
