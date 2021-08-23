import * as TestRunnerSupport from '../../TestRunnerSupport';
import ForesightWrapperUtils from '../../ForesightWrapperUtils';
import ExecutionContextManager from '../../../../context/ExecutionContextManager';
import TestCaseExecutionContext from '../../model/TestCaseExecutionContext';
import TestSuiteEvent from '../../model/TestSuiteEvent';

export async function start(event: TestSuiteEvent) {

    console.log('afterAllStart')
}

export async function finish(event: TestSuiteEvent) {

    console.log('afterAllFinish')
}