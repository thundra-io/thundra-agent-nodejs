import ExecutionContext from '../../../context/ExecutionContext';
import TestCaseScope from './TestCaseScope';

import { TestRunnerTags } from '../model/TestRunnerTags';
import { TEST_STATUS } from '../../../Constants';

export default class TestCaseExecutionContext extends ExecutionContext {
    
    testCaseId: string;
    testSuiteName: string;
    testCaseScope: TestCaseScope;

    constructor(opts: any = {}) {
        super(opts)
    }

    getContextInformation(){
        return {
            domainName: 'Test',
            applicationDomainName: 'Test',
            operationName: this.testCaseScope.method,
            className: 'Jest',
            applicationClassName: 'Jest'
        }
    }

    getAdditionalStartTags() {

        console.log('getAdditionalStartTags test');

        return {
            [TestRunnerTags.TEST_SUITE]: this.testSuiteName,
            [TestRunnerTags.TEST_NAME]: this.testCaseScope ? this.testCaseScope.name : undefined,
            [TestRunnerTags.TEST_METHOD]: this.testCaseScope ? this.testCaseScope.method: undefined,
            [TestRunnerTags.TEST_CLASS]: this.testCaseScope ? this.testCaseScope.testClass: undefined,
        }
    }

    getAdditionalFinishTags() {

        console.log('getAdditionalFinishTags');

        return {
            [TestRunnerTags.TEST_STATUS]: TEST_STATUS.SUCCESSFUL  // this.testCaseScope ? this.testCaseScope.status: undefined,
        }
    }
}