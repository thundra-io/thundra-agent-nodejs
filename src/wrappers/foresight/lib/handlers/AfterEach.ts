import * as TestRunnerSupport from '../../TestRunnerSupport';
import ForesightWrapperUtils from '../../ForesightWrapperUtils';
import ExecutionContextManager from '../../../../context/ExecutionContextManager';
import TestCaseExecutionContext from '../../model/TestCaseExecutionContext';
import TestSuiteEvent from '../../model/TestSuiteEvent';

export default async function run(event: TestSuiteEvent) {

    console.log('afterEach')
}