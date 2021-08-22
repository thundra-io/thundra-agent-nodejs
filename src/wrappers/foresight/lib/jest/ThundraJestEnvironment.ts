import { Event, State } from 'jest-circus';

import { EnvironmentContext } from '@jest/environment'

import type { Config } from '@jest/types';

import * as TestRunnerSupport from '../../TestRunnerSupport';

import JestEventHandlers from './handlers';

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

    async handleTestEvent(event: Event, state: State) {    

      /**
       * todo: handle test event name
       * create eventName with using event.hook
       */
      const eventName = this.createEventName(event);

      const handler = JestEventHandlers.get(eventName);
      if (handler) {
        await handler(event, state);
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