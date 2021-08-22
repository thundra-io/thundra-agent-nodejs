import { Event, State } from 'jest-circus';

import * as TestRunnerSupport from '../../../TestRunnerSupport';
import ForesightWrapperUtils from '../../../ForesightWrapperUtils';
import ExecutionContextManager from '../../../../../context/ExecutionContextManager';
import TestCaseExecutionContext from '../../../model/TestCaseExecutionContext';

export default async function run(event: Event, state: State) {

    console.log('afterEach')
}