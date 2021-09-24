import ExecutionContext from '../../../context/ExecutionContext';

import { TestRunnerTags } from '../model/TestRunnerTags';
import { ContextMode, TEST_STATUS } from '../../../Constants';

import * as TestRunnerSupport from '../TestRunnerSupport';

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

        const baseContextInformation = super.getContextInformation();

        return {
            ...( baseContextInformation ? baseContextInformation : undefined ),
            domainName: this.applicationDomainName,
            operationName: this.method,
            className: this.applicationClassName,
            applicationName: this.testSuiteName,
        };
    }

    getAdditionalStartTags() {

        const testRunScope = TestRunnerSupport.testRunScope;

        return {
            [TestRunnerTags.TEST_RUN_ID]: testRunScope.id,
            [TestRunnerTags.TEST_RUN_TASK_ID]: testRunScope.taskId,
            [TestRunnerTags.TEST_SUITE]: this.testSuiteName,
            [TestRunnerTags.TEST_NAME]: this.name,
            [TestRunnerTags.TEST_METHOD]: this.method,
            [TestRunnerTags.TEST_CLASS]: this.testClass,
        };
    }

    getAdditionalFinishTags() {

        return {
            [TestRunnerTags.TEST_STATUS]: this.status,
            ...(TestRunnerSupport.testSuiteExecutionContext && TestRunnerSupport.testSuiteExecutionContext.invocationData
                ?
                {
                    [TestRunnerTags.TEST_SUITE_TRANSACTION_ID]:
                        TestRunnerSupport.testSuiteExecutionContext.invocationData.transactionId,
                }
                : undefined),
        };
    }

    protected initContextMode() {

        this.compatibleContextModes.push(ContextMode.GlobalMode);
    }
}
