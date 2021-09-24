import Path from 'path';

import * as TestRunnerSupport from '../../TestRunnerSupport';
import { JestEventHandlers } from '../handlers';
import TestSuiteEvent from '../../model/TestSuiteEvent';
import WrapperContext from '../../../WrapperContext';
import ForesightWrapperUtils from '../../ForesightWrapperUtils';
import * as ForesightExecutor from '../../ForesightExecutor';
import ConfigNames from '../../../../config/ConfigNames';
import ConfigProvider from '../../../../config/ConfigProvider';
import ThundraLogger from '../../../../ThundraLogger';
import LoadTestModules from './ModuleLoader';
import TracePlugin from '../../../../plugins/Trace';
import LogPlugin from '../../../../plugins/Log';
import InvocationPlugin from '../../../../plugins/Invocation';
import ThundraConfig from '../../../../plugins/config/ThundraConfig';
import MaxCountAwareSampler from '../../sampler/MaxCountAwareSampler';
import TestTraceAwareSampler from '../../sampler/TestTraceAwareSampler';

import stripAnsi from 'strip-ansi';

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

      ThundraLogger.debug(`<ThundraJestEnvironment> Initializing ...`);

      this.toBeAttachedToJestTestScope();
      this.setSamplersToConfig();

      /**
       * will add default SetupFile
       */
      const setupFilePath = Path.join(__dirname, __PRIVATE__.getSetupFilePath());
      config.setupFiles.push(setupFilePath);

      this.testSuite = context.testPath.split('/').pop();

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
      let error: Error;

      if (event.test && event.test.parent) {
        const test = event.test;

        id = testSuite + '-' + test.parent.name;
        testName = test.name;
        testDuration = test.duration;

        const errorArr = test.errors;
        if (errorArr.length) {

          let stack;
          let spareStack;
          let message;

          if (test.errors) {

            const errObj = test.errors[0];
            if (errObj) {
              message = typeof errObj[0] === 'object' ? errObj[0].message : errObj[0];
            }

            if (errObj.length > 1) {
              spareStack = typeof errObj[1] === 'object' ? errObj[1].stack : errObj[1];
            }
          }

          if (test.asyncError && test.asyncError.stack) {
            stack = test.asyncError.stack;
          } else {
            stack = spareStack;
          }

          error = new Error(stripAnsi(message));
          error.stack = stack;
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

          LoadTestModules(testRequire);

          const foresightLogPlugin = ForesightWrapperUtils.createLogPlugin(this.global.console);
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

          ThundraLogger.debug(`<ThundraJestEnvironment> Event name can not be empty. Testsuite name: ${this.testSuite}.`);
          return;
        }

        const testSuiteEvent = this.createTestSuiteEvent(event, state);

        if (!testSuiteEvent) {

          ThundraLogger.debug(`<ThundraJestEnvironment> Test suite event can not be empty. Testsuite name: ${this.testSuite}.`);
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
  },
  {
    name: 'jest-environment-jsdom',
    version: '>=24.8.0',
    patch,
  },
];

/* test-code */
export const __PRIVATE__ = {
  getSetupFilePath: () => {
      return './wrappers/foresight/lib/jest/SetupFile.js';
  },
};
/* end-test-code */