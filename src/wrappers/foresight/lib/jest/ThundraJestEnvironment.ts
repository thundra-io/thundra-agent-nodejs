import { Event, State } from 'jest-circus';

import { EnvironmentContext } from '@jest/environment'

import type { Config } from '@jest/types';

import ForesightWrapperUtils from '../../ForesightWrapperUtils';

import ExecutionContextManager from '../../../../context/ExecutionContextManager';

import * as ForesightExecutor from '../../ForesightExecutor';

import * as TestRunnerSupport from '../../TestRunnerSupport';
import TestRunResult from '../../model/TestRunResult';
import TestSuiteExecutionContext from '../../model/TestSuiteExecutionContext';

import * as EnvironmentSupport from '../../environment/EnvironmentSupport';
import TestCaseExecutionContext from '../../model/TestCaseExecutionContext';
import { ApplicationManager } from '../../../../application/ApplicationManager';

function wrapEnvironment (BaseEnvironment: any) {
  return class ThundraJestEnvironment extends BaseEnvironment {

    testSuite: string;
    testSuiteContext: TestSuiteExecutionContext;
    config: Config.ProjectConfig;

    constructor (config: Config.ProjectConfig, context: EnvironmentContext) {
      super(config, context)
      
      this.config = config;
      
      this.testSuite = context.testPath.replace(`${config.rootDir}/`, '');
      
      /**
       * will be removed & will use single reporter 
       * when test run events with composite data supported by collector. 
      */ 
      this.reporter = ForesightWrapperUtils.createTestRunReporter();
    }

    async init(){
      const { config } = this;

      if (!config.globals.thundraTestRunScope) {
        config.globals.thundraTestRunScope = {}
        
        await this.globalSetup();
        await this.globalTeardown();
      }
    }
    
    async globalSetup() {
      const { 
        config,
        reporter, 
      } = this;
    
      if (!TestRunnerSupport.initialized){
        console.log('global setup')
        
        const initResult = ForesightWrapperUtils.initWrapper(ForesightExecutor);
        config.globals.thundraTestRunScope = initResult;

        await EnvironmentSupport.init();

        const testRunStart = TestRunnerSupport.startTestRun();

        console.log({
          testRunId: testRunStart.id
        });
         
        try {

          /** todo: will ve remove after common reporter instance will be used
           * still collector does not support composite data types.
           */
          const wrappedTestRunStart = {
            dataModelVersion: '2.0',
            type: 'TestRunStart',
            data: testRunStart,
          }

          await reporter.report(wrappedTestRunStart, '/testrun-start');
        } catch (error) {
          console.error(error);
        }         
      }
    }
    
    async globalTeardown() {
      const { reporter } = this;

      async function exitHandler(evtOrExitCodeOrError: number | string | Error) {
    
        console.log('global teardown');
    
        try {
          
          // todo: obtain test run result data in here
          const testRunResult = new TestRunResult(
            1, 1, 0, 0, 0
          );

          const testRunFinish = TestRunnerSupport.finishTestRun(testRunResult);

          /** todo: will ve remove after common reporter instance will be used
           * still collector does not support composite data types.
           */
          const wrappedTestRunFinish = {
            dataModelVersion: '2.0',
            type: 'TestRunFinish',
            data: testRunFinish,
          }

          await reporter.report(wrappedTestRunFinish, '/testrun-finish');
        } catch (e) {
          console.error('EXIT HANDLER ERROR', e);
        }
    
        process.exit(isNaN(+evtOrExitCodeOrError) ? 1 : +evtOrExitCodeOrError);
      }
    
      [
        'beforeExit', 'uncaughtException', 'unhandledRejection', 
        'SIGHUP', 'SIGINT', 'SIGQUIT', 'SIGILL', 'SIGTRAP', 
        'SIGABRT','SIGBUS', 'SIGFPE', 'SIGUSR1', 'SIGSEGV', 
        'SIGUSR2', 'SIGTERM', 
      ].forEach(evt => process.on(evt, exitHandler));
    }
    
    async handleTestEvent(event: Event, state: State) {    
      const { 
        config,
        reporter,
        testSuite
      } = this;
      
      if (event.name === 'setup') {
        await this.init();
        await this.startTestSuite();
      }
  
      if (event.name === 'teardown') {
        console.log('handle teardown');

        await this.finishTestSuite();
      }
      
      if (event.name === 'test_start') {
        console.log('test_start');

        await this.startTestCase(event);
        // todo: test case start will be impl
      }

      if (event.name === 'test_done') {
        console.log('test_done');

        await this.finishTestCase(event);
        // todo: test case finish will be impl
        // if event.errors any test case finished
        // else test case finished with success
      }
    }

    async startTestSuite() {

      const {
        config,
        testSuite
      } = this;

      console.log('startTestSuite')
      const thundraTestRunScope: any = config.globals.thundraTestRunScope;

      // const testRunScope = TestRunnerSupport.testRunScope;
      // console.log(testRunScope);

      ForesightWrapperUtils.setApplicationInfo('Test', 'TestSuite');
      const context: TestSuiteExecutionContext = ForesightWrapperUtils.createTestSuiteExecutionContext(testSuite);

      console.log('test suit created', context.transactionId);

      ExecutionContextManager.set(context);

      this.testSuiteContext = context;

      await ForesightWrapperUtils.beforeTestSuit(thundraTestRunScope.plugins, context);
    }

    async finishTestSuite() {

      console.log('finishTestSuite')
      const { config } = this;

      ForesightWrapperUtils.setApplicationInfo('Test', 'TestSuite');
      const thundraTestRunScope: any = config.globals.thundraTestRunScope;

      const context = this.testSuiteContext;
      ExecutionContextManager.set(context);

      await ForesightWrapperUtils.afterTestSuit(
        thundraTestRunScope.plugins,
        context,
        thundraTestRunScope.reporter);
    }

    async startTestCase(event: any){

      const {
        config,
        testSuite
      } = this;

      console.log('startTestCase1')

      const thundraTestRunScope: any = config.globals.thundraTestRunScope;

      ForesightWrapperUtils.setApplicationInfo('Test', 'Test');

      console.log('startTestCase2')

      const testCaseScope = ForesightWrapperUtils.createTestScope(event);

      console.log(testCaseScope);

      const context: TestCaseExecutionContext = ForesightWrapperUtils.createTestCaseExecutionContext(
        testCaseScope.testClass,
        testCaseScope.id
      ); 
      
      console.log('test context created', context.transactionId);

      context.testCaseScope = testCaseScope;

      TestRunnerSupport.putTestCaseContext(testCaseScope.id, context);

      ExecutionContextManager.set(context);

      console.log('startTestCase3')

      await ForesightWrapperUtils.beforeTestSuit(thundraTestRunScope.plugins, context);
    }

    async finishTestCase(event: any){
      const { 
        config,
        testSuiteContext
      } = this;

      console.log('finishTestCase');

      ForesightWrapperUtils.setApplicationInfo('Test', 'Test');

      const thundraTestRunScope: any = config.globals.thundraTestRunScope;

      const testEntry = event.test;
      
      const testCaseId = ForesightWrapperUtils.getTestCaseId(testEntry);
      if (!testCaseId) {
        console.log('testclass not found!')
      }

      const context: TestCaseExecutionContext = TestRunnerSupport.getTestCaseContext(testCaseId);

      console.log('finishTestCase context => ', context.transactionId);

      ExecutionContextManager.set(context);

      console.log('finishTestCase context switched => ', context.transactionId);

      await ForesightWrapperUtils.afterTestSuit(
        thundraTestRunScope.plugins,
        context,
        thundraTestRunScope.reporter);

      console.log('finishTestCase context switched => ', context.transactionId);
      ExecutionContextManager.set(testSuiteContext);
      ForesightWrapperUtils.setApplicationInfo('Test', 'TestSuit');
    }
  }
}

export default [{
  name: 'jest-environment-node',
  versions: ['>=24.8.0'],
  patch: function(NodeEnvironment: any, reporter: any) {

    return wrapEnvironment(NodeEnvironment);
  },
  unpatch: function (NodeEnvironment: any) {
    this.unwrap(NodeEnvironment.prototype, 'teardown')
    NodeEnvironment.prototype.handleTestEvent = NodeEnvironment.prototype.handleTestEvent._dd_original
    
  }},
  {
    name: 'jest-environment-jsdom',
    versions: ['>=24.8.0'],
    patch: function (JsdomEnvironment: any, reporter: any) {
      
      return wrapEnvironment(JsdomEnvironment)
    },
    unpatch: function (JsdomEnvironment: any) {
      this.unwrap(JsdomEnvironment.prototype, 'teardown')
      JsdomEnvironment.prototype.handleTestEvent = JsdomEnvironment.prototype.handleTestEvent._dd_original
    }
  }
]