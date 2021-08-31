import ExecutionContext from '../../../context/ExecutionContext';

import { TestRunnerTags } from '../model/TestRunnerTags';
import { TEST_STATUS } from '../../../Constants';
import { ApplicationManager } from '../../../application/ApplicationManager';

export default class TestCaseExecutionContext extends ExecutionContext {

    static APPLICATION_DOMAIN_NAME: string = 'Test';

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

    getContextInformation() {

        const { applicationClassName } = ApplicationManager.getApplicationInfo();

        return {
            domainName: TestCaseExecutionContext.APPLICATION_DOMAIN_NAME,
            applicationDomainName: TestCaseExecutionContext.APPLICATION_DOMAIN_NAME,
            operationName: this.method,
            className: applicationClassName,
            applicationClassName,
        };
    }

    getAdditionalStartTags() {

        return {
            [TestRunnerTags.TEST_SUITE]: this.testSuiteName,
            [TestRunnerTags.TEST_NAME]: this.name,
            [TestRunnerTags.TEST_METHOD]: this.method,
            [TestRunnerTags.TEST_CLASS]: this.testClass,
        };
    }

    getAdditionalFinishTags() {

        return {
            [TestRunnerTags.TEST_STATUS]: this.status,
        };
    }
}
