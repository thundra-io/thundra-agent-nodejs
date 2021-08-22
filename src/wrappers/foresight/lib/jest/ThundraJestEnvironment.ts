import { Event, State } from 'jest-circus';

import { EnvironmentContext } from '@jest/environment'

import type { Config } from '@jest/types';

import * as TestRunnerSupport from '../../TestRunnerSupport';

import { JestEventHandlers } from '../handlers';
import TestSuiteEvent from '../../model/TestSuiteEvent';

const APPLICATIONCLASSNAME = 'Jest';

function wrapEnvironment (BaseEnvironment: any) {
  return class ThundraJestEnvironment extends BaseEnvironment {

    testSuite: string;

    constructor (config: Config.ProjectConfig, context: EnvironmentContext) {
      super(config, context)
      
      this.config = config;
      
      this.testSuite = context.testPath.split("/").pop();

      TestRunnerSupport.setTestSuiteName(this.testSuite);
    }

    createEventName(event: any){
      
      let eventName = event.name; 
      if (eventName === 'hook_start' || eventName === 'hook_success') {
        eventName = `${eventName}<${event.hook.type}>`
      }

      return eventName;
    }

    createTestSuiteEvent(event: any, state: State) {

      const { testSuite } = this;

      if (!event) {
        return;
      }

      let id: string;
      const name: string = event.name;
      const orginalEvent = event;

      if (event.test && event.test.parent) {
        id = testSuite + '-' + event.test.parent.name;
      }

      return TestSuiteEvent
        .builder()
          .withId(id)
          .withName(name)
          .withOrginalEvent(orginalEvent)
          .withTestSuiteName(testSuite)
        .build();
    }

    async handleTestEvent(event: Event, state: State) {    

      /**
       * todo: handle test event name
       * create eventName with using event.hook
       */
      const eventName = this.createEventName(event);
      if (!eventName){
        /**
         * log & return
         */

         return;
      }

      const testSuiteEvent = this.createTestSuiteEvent(event, state);

      if (!testSuiteEvent){
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
  }
}

export default [{
    name: 'jest-environment-node',
    versions: ['>=24.8.0'],
    patch: function(NodeEnvironment: any, reporter: any) {

      return wrapEnvironment(NodeEnvironment);
    }
  },
  {
    name: 'jest-environment-jsdom',
    versions: ['>=24.8.0'],
    patch: function (JsdomEnvironment: any, reporter: any) {
      
      return wrapEnvironment(JsdomEnvironment)
    }
  }
]