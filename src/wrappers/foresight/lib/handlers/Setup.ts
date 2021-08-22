import * as TestRunnerSupport from '../../TestRunnerSupport';
import ForesightWrapperUtils from '../../ForesightWrapperUtils';
import * as ForesightExecutor from '../../ForesightExecutor';
import * as EnvironmentSupport from '../../environment/EnvironmentSupport';
import ExecutionContextManager from '../../../../context/ExecutionContextManager';
import TestSuiteExecutionContext from '../../model/TestSuiteExecutionContext';
import WrapperContext from '../../../WrapperContext';
import TestReporter from '../../reporter';
import TestSuiteEvent from '../../model/TestSuiteEvent';

const APPLICATIONCLASSNAME = 'Jest';

async function globalSetup() {
        
    const wrapperContext: WrapperContext = ForesightWrapperUtils.initWrapper(ForesightExecutor, APPLICATIONCLASSNAME);
    TestRunnerSupport.setWrapperContext(wrapperContext);
    await EnvironmentSupport.init();
    
    const testRunStart = TestRunnerSupport.startTestRun();
    if (!testRunStart){
        return;
    }
    
    console.log({
        testRunId: testRunStart.id
    });
    
    try {

        /**
        * todo: will be removed & will use single reporter (in wrapperContext)
        * when test run events with composite data supported by collector. 
        */ 
        const reporter = ForesightWrapperUtils.createTestRunReporter() as TestReporter;
        
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

async function globalTeardown() {
    
    async function exitHandler(evtOrExitCodeOrError: number | string | Error) {
        
        try {
            
            const testRunFinish = TestRunnerSupport.finishTestRun();
            if (!testRunFinish){
                return;
            }

            /**
            * todo: will be removed & will use single reporter (in wrapperContext)
            * when test run events with composite data supported by collector. 
            */ 
            const reporter = ForesightWrapperUtils.createTestRunReporter() as TestReporter;
            
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

async function initTestSuite() {
    
    if (!TestRunnerSupport.initialized) {
        TestRunnerSupport.setInitialized(true);
        
        await globalSetup();
        await globalTeardown();
    }
}

async function startTestSuite() {
    
    const context: TestSuiteExecutionContext = ForesightWrapperUtils.createTestSuiteExecutionContext(TestRunnerSupport.testSuiteName);
    TestRunnerSupport.setTestSuiteContext(context);
    
    ForesightWrapperUtils.changeAppInfoToTestSuite('Jest');
    ExecutionContextManager.set(context);
    
    await ForesightWrapperUtils.beforeTestProcess(TestRunnerSupport.wrapperContext.plugins, context);
}

export default async function run(event: TestSuiteEvent) {
     
    await initTestSuite();
    await startTestSuite();
}