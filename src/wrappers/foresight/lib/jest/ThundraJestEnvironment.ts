import * as TestRunnerSupport from '../../TestRunnerSupport';
import { JestEventHandlers } from '../handlers';
import TestSuiteEvent from '../../model/TestSuiteEvent';
import WrapperContext from '../../../WrapperContext';
import ForesightWrapperUtils from '../../ForesightWrapperUtils';
import * as ForesightExecutor from '../../ForesightExecutor';
import ConfigNames from '../../../../config/ConfigNames';
import ConfigProvider from '../../../../config/ConfigProvider';
import ThundraLogger from '../../../../ThundraLogger';
import {
    loadTestModules,
    wrapTestRequireModule,
    TransformWrapped,
    setTransformWrapped,
    wrapTestTransformFile,
    wrapTestTransformFileAsync,
    unwrapTestRequireModule,
    unwrapTestTransformFile,
    unwrapTestTransformFileAsync,
} from './ModuleLoader';
import TracePlugin from '../../../../plugins/Trace';
import LogPlugin from '../../../../plugins/Log';
import InvocationPlugin from '../../../../plugins/Invocation';
import ThundraConfig from '../../../../plugins/config/ThundraConfig';
import MaxCountAwareSampler from '../../sampler/MaxCountAwareSampler';
import TestTraceAwareSampler from '../../sampler/TestTraceAwareSampler';
import { resolveFromRoot } from '../../../../thundraInternalApi';

import TestRunnerUtils from '../../../../utils/TestRunnerUtils';

import { subscribeProcessExitEvents } from '../process';
import ErrorParser from '../jest/utils/ErrorParser';
import TestRunError from '../../model/TestRunError';

import Trace from '../../../../plugins/Trace';
import Log from '../../../../plugins/Log';
import TraceConfig from '../../../../plugins/config/TraceConfig';

const APPLICATIONCLASSNAME = 'Jest';

/**
 * This method will create a class which extend from BaseEnvironment.
 * @param BaseEnvironment BaseEnvironment
 */
function wrapEnvironment(BaseEnvironment: any) {
    return class ThundraJestEnvironment extends BaseEnvironment {

        testSuite: string;

        constructor (config: any, context: any) {
            super(config, context);

            ThundraLogger.debug('<ThundraJestEnvironment> Initializing ...');

            subscribeProcessExitEvents();

            this.toBeAttachedToJestTestScope();
            this.setSamplersToConfig();

            // Add default SetupFile
            const setupFilePath = resolveFromRoot(__PRIVATE__.getSetupFilePath());
            config.setupFiles.push(setupFilePath);

            this.testSuite = TestRunnerUtils.getTestFileName(context.testPath, config.cwd);

            TestRunnerSupport.setTestSuiteName(this.testSuite);

            TestRunnerSupport.setApplicationClassName(APPLICATIONCLASSNAME);

            const wrapperContext: WrapperContext = ForesightWrapperUtils.initWrapper(
                ForesightExecutor,
                APPLICATIONCLASSNAME,
                [
                    TracePlugin.name,
                    InvocationPlugin.name,
                ],
            );

            TestRunnerSupport.setWrapperContext(wrapperContext);

            ForesightWrapperUtils.initForesightContextManager();

            const testStatusReportFreq = ConfigProvider.get<number>(ConfigNames.THUNDRA_AGENT_TEST_STATUS_REPORT_FREQ, 10000);
            TestRunnerSupport.setTestStatusReportFreq(testStatusReportFreq);
        }

        setSamplersToConfig() {
            const thundraConfig: ThundraConfig = ConfigProvider.thundraConfig;
            if (thundraConfig && thundraConfig.logConfig && !thundraConfig.logConfig.sampler) {
                const maxCount = ConfigProvider.get<number>(ConfigNames.THUNDRA_AGENT_TEST_LOG_COUNT_MAX);
                thundraConfig.logConfig.sampler = new TestTraceAwareSampler({ create: () => new MaxCountAwareSampler(maxCount) });
            }
        }

        /**
         * Create event name with event object for handle test events.
         * Created value value will be used for select matched handler in JestEventHandlers
         * @param event event
         */
        createEventName(event: any) {
            let eventName = event.name;
            if (eventName === 'hook_start' || eventName === 'hook_success') {
                eventName = `${eventName}<${event.hook.type}>`;
            }

            return eventName;
        }

        /**
         * Create TestSuiteEvent object for related handlers.
         * @param event event
         * @param state state
         */
        createTestSuiteEvent(event: any, state: any) {
            if (!event) {
                return;
            }

            const { testSuite } = this;

            const name: string = event.name;
            const orginalEvent = event;

            let id: string;
            let testName: string;
            let testDuration: number;
            let error: TestRunError;

            if (event.test && event.test.parent) {
              const test = event.test;

              id = testSuite + '-' + test.parent.name;
              testName = test.name;
              testDuration = test.duration;

              const errorArr = test.errors;
              if (errorArr && errorArr.length) {
                error = ErrorParser.buildError(test.errors, test.asyncError);
              }
            }

            return TestSuiteEvent
                .builder()
                .withId(id)
                .withName(name)
                .withTestName(testName)
                .withTestDuration(testDuration)
                .withError(error)
                .withOrginalEvent(orginalEvent)
                .withTestSuiteName(testSuite)
                .build();
        }

        /**
         * set test suite context console to current global console.
         * set loadThundraTestModules function to testsute global object.
         * loadThundraTestModules function will be triggered per testcase.
         */
        toBeAttachedToJestTestScope() {
            this.global.__THUNDRA__ = {
                testScopeLoaded: (testRequire: any) => {
                    loadTestModules(testRequire);

                    wrapTestRequireModule();
                    const tracePlugin: Trace = TestRunnerSupport.wrapperContext.getPlugin(Trace.NAME);
                    if (tracePlugin) {
                        const traceConfig: TraceConfig = tracePlugin.config;
                        if (traceConfig && traceConfig.traceableConfigs && traceConfig.traceableConfigs.length > 0) {
                            tracePlugin.initInstrumenter(this.global);
                            wrapTestTransformFile(tracePlugin);
                            wrapTestTransformFileAsync(tracePlugin);
                        }
                    }

                    const foresightLogPlugin: Log = ForesightWrapperUtils.createLogPlugin(this.global.console);
                    if (foresightLogPlugin && TestRunnerSupport.wrapperContext
                        && TestRunnerSupport.wrapperContext.plugins && TestRunnerSupport.wrapperContext.pluginContext) {
                        foresightLogPlugin.setPluginContext(TestRunnerSupport.wrapperContext.pluginContext);
                        TestRunnerSupport.wrapperContext.plugins.push(foresightLogPlugin);

                        WrapperContext.addIgnoredPlugin(LogPlugin.name);
                    }
                },
                /* test-code */
                testRunnerSupport: TestRunnerSupport,
                /* test-code */
            };
        }

        /**
         * Override handleTestEvent method.
         * All test actions handle on this method.
         * @param event event
         * @param state state
         */
        async handleTestEvent(event: any, state: any) {
            try {
                const eventName = this.createEventName(event);
                if (!eventName) {
                    ThundraLogger.debug(
                        `<ThundraJestEnvironment> Event name can not be empty. Testsuite name: ${this.testSuite}.`);
                    return;
                }

                const testSuiteEvent = this.createTestSuiteEvent(event, state);
                if (!testSuiteEvent) {
                    ThundraLogger.debug(
                        `<ThundraJestEnvironment> Test suite event can not be empty. Testsuite name: ${this.testSuite}.`);
                    return;
                }

                const handler = JestEventHandlers.get(eventName);
                if (handler) {
                    await handler(testSuiteEvent);
                }
            } catch (error) {
                ThundraLogger.error('<ThundraJestEnvironment> An error occured while handling test event.', error);
            }
        }

        async teardown() {
            unwrapTestRequireModule();

            if (TransformWrapped) {
                unwrapTestTransformFile();
                unwrapTestTransformFileAsync();
                setTransformWrapped(false);
            }
        }

    };
}

/**
 * Patch method of module.
 * @param Environment Environment
 */
const patch = (Environment: any) => {
    const projectId = ConfigProvider.get<string>(ConfigNames.THUNDRA_AGENT_TEST_PROJECT_ID);
    if (!projectId) {
        ThundraLogger.error('<ThundraJestEnvironment> Test project id must be filled ...');
        return Environment;
    }

    TestRunnerSupport.setProjectId(projectId);
    return wrapEnvironment(Environment);
};

export default [{
    name: 'jest-environment-node',
    version: '>=24.8.0',
    patch,
}, {
    name: 'jest-environment-jsdom',
    version: '>=24.8.0',
    patch,
}];

/* test-code */
export const __PRIVATE__ = {
    getSetupFilePath: () => {
        return './bootstrap/foresight/jest/SetupFile.js';
    },
};
/* end-test-code */
