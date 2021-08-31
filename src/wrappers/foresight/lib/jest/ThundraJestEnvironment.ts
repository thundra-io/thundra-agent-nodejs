import Path from 'path';

import { Event, State } from 'jest-circus';
import { EnvironmentContext } from '@jest/environment';
import type { Config } from '@jest/types';

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

const APPLICATIONCLASSNAME = 'Jest';

function wrapEnvironment(BaseEnvironment: any) {
  return class ThundraJestEnvironment extends BaseEnvironment {

    testSuite: string;

    constructor (config: Config.ProjectConfig, context: EnvironmentContext) {
      super(config, context);

      const setupFilePath = Path.join(__dirname, './wrappers/foresight/lib/jest/SetupFile.js');
      config.setupFiles.push(setupFilePath);

      this.testSuite = context.testPath.split('/').pop();

      TestRunnerSupport.setTestSuiteName(this.testSuite);

      const wrapperContext: WrapperContext = ForesightWrapperUtils.initWrapper(ForesightExecutor, APPLICATIONCLASSNAME);
      TestRunnerSupport.setWrapperContext(wrapperContext);

      const testStatusReportFreq = ConfigProvider.get<number>(ConfigNames.THUNDRA_AGENT_TEST_STATUS_REPORT_FREQ, 10000);
      TestRunnerSupport.setTestStatusReportFreq(testStatusReportFreq);
    }

    createEventName(event: any) {

      let eventName = event.name;
      if (eventName === 'hook_start' || eventName === 'hook_success') {
        eventName = `${eventName}<${event.hook.type}>`;
      }

      return eventName;
    }

    createTestSuiteEvent(event: any, state: State) {

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

          const stack = test.asyncError.stack;
          const message = test.asyncError.message || test.errors[0];
          error = new Error(message);
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

    getVmContext() {
      const vmContentext = super.getVmContext();

      vmContentext.global.loadThundraTestModules = LoadTestModules;

      return vmContentext;
    }

    async handleTestEvent(event: Event, state: State) {

      const eventName = this.createEventName(event);
      if (!eventName) {
        /**
         * log & return
         */

         return;
      }

      const testSuiteEvent = this.createTestSuiteEvent(event, state);

      if (!testSuiteEvent) {
        /**
         * log & return
         */

         return;
      }

      const handler = JestEventHandlers.get(eventName);
      if (handler) {
        await handler(testSuiteEvent);
      }
    }
  };
}

export default [{
    name: 'jest-environment-node',
    versions: ['>=24.8.0'],
    patch(NodeEnvironment: any) {

      const projectId = ConfigProvider.get<string>(ConfigNames.THUNDRA_AGENT_TEST_PROJECT_ID);
      if (!projectId) {

        ThundraLogger.error('<ThundraJestEnvironment> Test project id must be filled ...');
        return NodeEnvironment;

      }

      TestRunnerSupport.setProjectId(projectId);
      return wrapEnvironment(NodeEnvironment);
    },
   },
  // {
  //   name: 'jest-environment-jsdom',
  //   versions: ['>=24.8.0'],
  //   patch: function (JsdomEnvironment: any) {

  //     const projectId = ConfigProvider.get<string>(ConfigNames.THUNDRA_AGENT_TEST_PROJECT_ID);
  //     if (!projectId) {

  //       ThundraLogger.error('<ThundraJestEnvironment> Test project id must be filled ...');
  //       return JsdomEnvironment;

  //     }

  //     TestRunnerSupport.setProjectId(projectId);
  //     return wrapEnvironment(JsdomEnvironment);
  //   }
  // }
];
