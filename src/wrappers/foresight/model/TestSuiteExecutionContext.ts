import ExecutionContext from '../../../context/ExecutionContext';

import { TestRunnerTags } from '../model/TestRunnerTags';

export default class TestSuiteExecutionContext extends ExecutionContext {

    testSuiteName: string;
    totalCount: number;
    successfulCount: number;
    failedCount: number;
    ignoredCount: number;
    abortedCount: number;
    resourcesDuration: number;
    completed: boolean;
    closed: boolean;

    constructor(opts: any = {}) {
        super(opts)

        this.testSuiteName = opts.testSuiteName || '';
        this.totalCount = opts.totalCount || '';
        this.successfulCount = opts.successfulCount || 0;
        this.failedCount = opts.failedCount || 0;
        this.ignoredCount = opts.ignoredCount || 0;
        this.abortedCount = opts.abortedCount || 0;
        this.resourcesDuration = opts.resourcesDuration || 0;
        this.completed = opts.completed || false;
        this.closed = opts.closed || false;
    }

    getContextInformation(){
        return {
            domainName: 'TestSuite',
            applicationDomainName: 'TestSuite',
            operationName: this.testSuiteName,
            className: 'Jest',
            applicationClassName: 'Jest'
        }
    }

    getAdditionalStartTags() {
        console.log('TestSuiteExecutionContext')

        return {
            [TestRunnerTags.TEST_SUITE]: this.testSuiteName
        }
    }

    getAdditionalFinishTags() {
        return {}
    }
}