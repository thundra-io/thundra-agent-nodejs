import ExecutionContext from '../../../context/ExecutionContext';

import { TestRunnerTags } from '../model/TestRunnerTags';
import { TEST_STATUS } from '../../../Constants';

export default class TestCaseExecutionContext extends ExecutionContext {
    
    id: string;
    name: string;
    method: string;
    testClass: string;
    status: TEST_STATUS;
    testSuiteName: string;

    constructor(opts: any = {}) {
        super(opts);

        this.id = opts.id || '';
        this.name = opts.name || '';
        this.method = opts.method || '';
        this.testClass = opts.testClass || '';
        this.testSuiteName = opts.testSuiteName || '';
    }

    setStatus(status: TEST_STATUS) {
        this.status = status;
    }

    getContextInformation(){

        /** todo: take className and applicationClassName from current AppInfo object
         *  they will take same value
         */

        return {
            domainName: 'Test',
            applicationDomainName: 'Test',
            operationName: this.method,
            className: 'Jest',
            applicationClassName: 'Jest'
        }
    }

    getAdditionalStartTags() {

        return {
            [TestRunnerTags.TEST_SUITE]: this.testSuiteName,
            [TestRunnerTags.TEST_NAME]: this.name,
            [TestRunnerTags.TEST_METHOD]: this.method,
            [TestRunnerTags.TEST_CLASS]: this.testClass,
        }
    }

    getAdditionalFinishTags() {

        return {
            [TestRunnerTags.TEST_STATUS]: this.status,
        }
    }
}