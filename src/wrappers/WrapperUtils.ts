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
import TimeoutError from '../error/TimeoutError';
import InvocationSupport from '../plugins/support/InvocationSupport';
import InvocationTraceSupport from '../plugins/support/InvocationTraceSupport';
import { HttpTags, DomainNames, ClassNames } from '../Constants';
import ThundraSpanContext from '../opentracing/SpanContext';

const get = require('lodash.get');

export default class WrapperUtils {
    static beforeRequest(request: any, plugins: any[]) {
        const context = ExecutionContextManager.get();

        // Put current request into the execution context
        context.request = request;

        for (const plugin of plugins) {
            plugin.beforeInvocation(context);
        }
    }

    static async afterRequest(response: any, plugins: any[], reporter: Reporter) {
        const context = ExecutionContextManager.get();

        context.finishTimestamp = Date.now();
        context.response = response;

        for (const plugin of plugins) {
            plugin.afterInvocation(context);
        }

        try {
            await reporter.sendReports(context.reports);
        } catch (err) {
            ThundraLogger.error(err);
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
        const applicationInfo = ApplicationManager.getApplicationInfo();

        return new PluginContext({
            applicationInfo,
            apiKey,
            executor,
        });
    }

    static initAsyncContextManager() {
        ExecutionContextManager.setProvider(asyncContextProvider);
        ExecutionContextManager.init();
    }

    static createExecContext(): ExecutionContext {
        const { thundraConfig } = ConfigProvider;
        const tracerConfig = get(thundraConfig, 'traceConfig.tracerConfig', {});

        const tracer = new ThundraTracer(tracerConfig);
        const transactionId = Utils.generateId();

        tracer.setTransactionId(transactionId);

        const startTimestamp = Date.now();

        return new ExecutionContext({
            tracer,
            transactionId,
            startTimestamp,
        });
    }

    static createInvocationData(execContext: ExecutionContext, pluginContext: PluginContext): InvocationData {
        const invocationData = Utils.initMonitoringData(pluginContext,
            MonitoringDataType.INVOCATION) as InvocationData;

        invocationData.applicationPlatform = '';
        invocationData.applicationRegion = pluginContext.applicationInfo.applicationRegion;
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
        const { error, invocationData } = execContext;

        if (error) {
            const parsedErr = Utils.parseError(error);
            invocationData.setError(parsedErr);

            if (error instanceof TimeoutError) { // TODO: Move to platform utils
                invocationData.timeout = true;
                invocationData.tags['aws.lambda.invocation.timeout'] = true;
            }

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

        invocationData.finishTimestamp = finishTimestamp;
        invocationData.duration = finishTimestamp - startTimestamp;
        invocationData.resources = InvocationTraceSupport.getResources(spanId);
        invocationData.incomingTraceLinks = InvocationTraceSupport.getIncomingTraceLinks();
        invocationData.outgoingTraceLinks = InvocationTraceSupport.getOutgoingTraceLinks();

        if (Utils.isValidHTTPResponse(response)) {
            invocationData.setUserTags({ [HttpTags.HTTP_STATUS]: response.statusCode });
        }
    }

    static startTrace(rootSpanName: string, pluginContext: PluginContext, execContext: ExecutionContext) {
        const { tracer, request } = execContext;
        const propagatedSpanContext: ThundraSpanContext =
            tracer.extract(opentracing.FORMAT_HTTP_HEADERS, request.headers) as ThundraSpanContext;

        const traceId = get(propagatedSpanContext, 'traceId') || Utils.generateId();

        const rootSpan = tracer._startSpan(rootSpanName, {
            propagated: propagatedSpanContext ? true : false,
            parentContext: propagatedSpanContext,
            rootTraceId: traceId,
            domainName: DomainNames.API,
            className: ClassNames.EXPRESS,
        });

        execContext.traceId = traceId;
        execContext.rootSpan = rootSpan;
        execContext.spanId = execContext.rootSpan.spanContext.spanId;
        execContext.rootSpan.startTime = execContext.startTimestamp;
    }

    static finishTrace(pluginContext: PluginContext, execContext: ExecutionContext) {
        const { rootSpan, finishTimestamp} = execContext;

        rootSpan.finish();
        rootSpan.finishTime = finishTimestamp;
    }

}
