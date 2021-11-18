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
import { ApplicationManager } from '../application/ApplicationManager';
import ExecutionContext from '../context/ExecutionContext';
import Utils from '../utils/Utils';
import ThundraTracer from '../opentracing/Tracer';
import * as asyncContextProvider from '../context/asyncContextProvider';
import * as opentracing from 'opentracing';
import MonitoringDataType from '../plugins/data/base/MonitoringDataType';
import InvocationData from '../plugins/data/invocation/InvocationData';
import InvocationSupport from '../plugins/support/InvocationSupport';
import InvocationTraceSupport from '../plugins/support/InvocationTraceSupport';
import { HttpTags, SpanTags, TriggerHeaderTags } from '../Constants';
import ThundraSpanContext from '../opentracing/SpanContext';
import { ApplicationInfo } from '../application/ApplicationInfo';
import HttpError from '../error/HttpError';
import WrapperContext from './WrapperContext';

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
            for (const plugin of plugins) {
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

        if (!ConfigProvider.get<boolean>(ConfigNames.THUNDRA_LOG_DISABLE) && config.logConfig.enabled) {
            plugins.push(new LogPlugin(config.logConfig));
        }

        const invocationPlugin = new InvocationPlugin(config.invocationConfig);
        plugins.push(invocationPlugin);

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
                    appInfoFromConfig.applicationName || applicationDomainName,
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
        invocationData.coldStart = pluginContext.requestCount === 0;
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
}
