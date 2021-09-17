import ConfigProvider from '../../config/ConfigProvider';
import ThundraConfig from '../../plugins/config/ThundraConfig';
import ConfigNames from '../../config/ConfigNames';
import { ApplicationManager } from '../../application/ApplicationManager';
import ThundraLogger from '../../ThundraLogger';
import Reporter from '../../Reporter';
import PluginContext from '../../plugins/PluginContext';
import ExecutionContext from '../../context/ExecutionContext';
import InvocationSupport from '../../plugins/support/InvocationSupport';
import Utils from '../../utils/Utils';
import InvocationTraceSupport from '../../plugins/support/InvocationTraceSupport';
import TracePlugin from '../../plugins/Trace';
import LogPlugin from '../../plugins/Log';
import InvocationPlugin from '../../plugins/Invocation';
import { ApplicationInfo } from '../../application/ApplicationInfo';
import InvocationData from '../../plugins/data/invocation/InvocationData';
import MonitoringDataType from '../../plugins/data/base/MonitoringDataType';
import ThundraTracer from '../../opentracing/Tracer';
import TestSuiteExecutionContext from './model/TestSuiteExecutionContext';

import * as TestRunnerSupport from './TestRunnerSupport';
import TestCaseExecutionContext from './model/TestCaseExecutionContext';
import WrapperContext from '../WrapperContext';

const get = require('lodash.get');

const TEST_SUIT_APPLICATION_DOMAIN_NAME = 'TestSuite';
const TEST_CASE_APPLICATION_DOMAIN_NAME = 'Test';

/**
 * Utility class for Foresight wrapper
 */
export default class ForesightWrapperUtils {

    /**
     * Initiate test wrapper context
     * @param executor executor
     * @param applicationClassName applicationClassName
     */
    static initWrapper(
        executor: any,
        applicationClassName: string,
        pluginsWillBeLoaded: string[] = [
            TracePlugin.name,
            LogPlugin.name,
            InvocationPlugin.name,
        ]) {

        ForesightWrapperUtils.setApplicationInfo(applicationClassName, 'TestSuite', 'TestSuite');

        const config = ConfigProvider.thundraConfig;
        const { apiKey } = config;

        const reporter = ForesightWrapperUtils.createReporter(apiKey);
        const pluginContext = ForesightWrapperUtils.createPluginContext(apiKey, executor);
        const plugins = ForesightWrapperUtils.createPlugins(config, pluginContext, pluginsWillBeLoaded);

        return new WrapperContext(reporter, pluginContext, plugins);
    }

    /**
     * Update current application info provider properties
     * @param applicationClassName applicationClassName
     * @param applicationDomainName applicationDomainName
     * @param applicationName applicationName
     */
    static setApplicationInfo(
        applicationClassName: string,
        applicationDomainName: string,
        applicationName: string) {

        ApplicationManager.setApplicationInfoProvider().update({
            applicationClassName,
            applicationDomainName,
            applicationName,
        });

        const appInfo = ApplicationManager.getApplicationInfo();
        ApplicationManager.getApplicationInfoProvider().update({
            applicationId: ForesightWrapperUtils.getDefaultApplicationId(appInfo),
        });
    }

    /**
     * Change application info to test suite
     */
    static changeAppInfoToTestSuite() {

        if (TestRunnerSupport.testSuiteExecutionContext) {

            const { applicationClassName } = ApplicationManager.getApplicationInfo();

            ForesightWrapperUtils.setApplicationInfo(
                applicationClassName,
                TEST_SUIT_APPLICATION_DOMAIN_NAME,
                TestRunnerSupport.testSuiteName);
        }
    }

    /**
     * Change application info to test case
     */
    static changeAppInfoToTestCase() {

        if (TestRunnerSupport.testSuiteExecutionContext) {
            const { applicationClassName } = ApplicationManager.getApplicationInfo();

            ForesightWrapperUtils.setApplicationInfo(
                applicationClassName,
                TEST_CASE_APPLICATION_DOMAIN_NAME,
                TestRunnerSupport.testSuiteName);
        }
    }

    /**
     * Generate application id value
     * @param appInfo appInfo
     */
    static getDefaultApplicationId(appInfo: ApplicationInfo) {

        const applicationId = `node:test:${appInfo.applicationClassName}:${appInfo.applicationName}`;
        return applicationId.toLowerCase();
    }

    /**
     * Create plugins
     * @param config config
     * @param pluginContext pluginContext
     */
    static createPlugins(config: ThundraConfig, pluginContext: PluginContext, pluginsWillBeLoaded: string[]): any[] {

        const plugins: any[] = [];
        if (config.disableMonitoring) {
            return plugins;
        }

        if (pluginsWillBeLoaded.includes(TracePlugin.name)
            && !ConfigProvider.get<boolean>(ConfigNames.THUNDRA_TRACE_DISABLE)
            && config.traceConfig.enabled) {

            const tracePlugin = new TracePlugin(config.traceConfig);
            plugins.push(tracePlugin);
        }

        if (pluginsWillBeLoaded.includes(LogPlugin.name)
            && ConfigProvider.get<boolean>(ConfigNames.THUNDRA_AGENT_TEST_LOG_ENABLE)
            && config.logConfig.enabled) {

            const logPlugin = new LogPlugin(config.logConfig);
            plugins.push(logPlugin);
        }

        if (pluginsWillBeLoaded.includes(InvocationPlugin.name)) {

            const invocationPlugin = new InvocationPlugin(config.invocationConfig);
            plugins.push(invocationPlugin);
        }

        // Set plugin context for plugins
        plugins.forEach((plugin: any) => { plugin.setPluginContext(pluginContext); });

        return plugins;
    }

    /**
     * Create log plugin
     * @param consoleRef consoleRef
     */
    static createLogPlugin(consoleRef: any) {

        const config = ConfigProvider.thundraConfig;

        if (ConfigProvider.get<boolean>(ConfigNames.THUNDRA_AGENT_TEST_LOG_ENABLE) && config.logConfig.enabled) {
            return new LogPlugin(config.logConfig, consoleRef);
        }

        return null;
    }

    /**
     * Create plugin context
     * @param apiKey apiKey
     * @param executor executor
     */
    static createPluginContext(apiKey: string, executor: any): PluginContext {

        const applicationInfo = ApplicationManager.getApplicationInfo();

        return new PluginContext({
            applicationInfo,
            apiKey,
            executor,
        });
    }

    /**
     * Create reporter
     * @param apiKey apiKey
     */
    static createReporter(apiKey: string): Reporter {
        return new Reporter(apiKey);
    }

    /**
     * Create execution context for test suite
     * @param testSuiteName testSuiteName
     */
    static createTestSuiteExecutionContext(testSuiteName: string): TestSuiteExecutionContext {

        const { thundraConfig } = ConfigProvider;
        const tracerConfig = get(thundraConfig, 'traceConfig.tracerConfig', {});

        const tracer = new ThundraTracer(tracerConfig);
        const transactionId = Utils.generateId();

        tracer.setTransactionId(transactionId);

        const startTimestamp = Date.now();

        return new TestSuiteExecutionContext({
            tracer,
            transactionId,
            startTimestamp,
            testSuiteName,
        });
    }

    /**
     * Create execution context for test case
     * @param testSuiteName testSuiteName
     * @param testCaseId testCaseId
     */
    static createTestCaseExecutionContext(testSuiteName: string, testCaseId: string): TestCaseExecutionContext {
        const { thundraConfig } = ConfigProvider;
        const tracerConfig = get(thundraConfig, 'traceConfig.tracerConfig', {});

        const tracer = new ThundraTracer(tracerConfig);
        const transactionId = Utils.generateId();

        tracer.setTransactionId(transactionId);

        const startTimestamp = Date.now();

        return new TestCaseExecutionContext({
            tracer,
            transactionId,
            startTimestamp,
            testSuiteName,
            id: testCaseId,
        });
    }

    /**
     * Invoke plugins before invocation methods
     * @param plugins plugins
     * @param context context
     */
    static async beforeTestProcess(plugins: any[], context: ExecutionContext) {

        for (const plugin of plugins) {
            await plugin.beforeInvocation(context);
        }
    }

    /**
     * Invoke plugins after invocation methods
     * @param plugins plugins
     * @param context context
     * @param reporter reporter
     */
    static async afterTestProcess(plugins: any[], context: ExecutionContext, reporter: Reporter) {

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

    /**
     * Start trace
     * @param pluginContext pluginContext
     * @param execContext execContext
     */
    static startTrace(pluginContext: PluginContext, execContext: ExecutionContext) {

        const { tracer } = execContext;
        const traceId = Utils.generateId();
        const contextInformation: any = execContext.getContextInformation();

        const rootSpan = tracer._startSpan(contextInformation.operationName, {
            propagated: false,
            rootTraceId: traceId,
            domainName: contextInformation.applicationDomainName,
            className: contextInformation.applicationClassName,
        });

        rootSpan.isRootSpan = true;

        execContext.traceId = traceId;
        execContext.rootSpan = rootSpan;
        execContext.spanId = execContext.rootSpan.spanContext.spanId;
        execContext.rootSpan.startTime = execContext.startTimestamp;
    }

    /**
     * Finish trace
     * @param pluginContext pluginContext
     * @param execContext execContext
     */
    static finishTrace(pluginContext: PluginContext, execContext: ExecutionContext) {

        const {
            error,
            rootSpan,
            finishTimestamp,
        } = execContext;

        if (error) {
            rootSpan.setErrorTag(error);
        }

        rootSpan.finish(finishTimestamp);
    }

    /**
     * Create invocation data
     * @param execContext execContext
     * @param pluginContext pluginContext
     */
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

    /**
     * Finish invocation data
     * @param execContext execContext
     * @param pluginContext pluginContext
     */
    static finishInvocationData(execContext: ExecutionContext, pluginContext: PluginContext) {

        const {
            error,
            invocationData,
            applicationResourceName,
            timeout,
        } = execContext;

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

        if (timeout) {
            invocationData.timeout = timeout;
        }

        invocationData.setTags(InvocationSupport.getAgentTags());
        invocationData.setUserTags(InvocationSupport.getTags());

        const {
            finishTimestamp,
            spanId,
        } = execContext;

        invocationData.finish(finishTimestamp);

        invocationData.resources = InvocationTraceSupport.getResources(spanId);
        invocationData.incomingTraceLinks = InvocationTraceSupport.getIncomingTraceLinks();
        invocationData.outgoingTraceLinks = InvocationTraceSupport.getOutgoingTraceLinks();
        invocationData.applicationResourceName = applicationResourceName;
    }
}
