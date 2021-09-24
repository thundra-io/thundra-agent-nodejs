import { ContextMode } from '../../../Constants';
import ExecutionContext from '../../../context/ExecutionContext';

import { TestRunnerTags } from '../model/TestRunnerTags';

import * as TestRunnerSupport from '../TestRunnerSupport';

export default class TestSuiteExecutionContext extends ExecutionContext {

    static APPLICATION_DOMAIN_NAME: string = 'TestSuite';

    testSuiteName: string;
    totalCount: number;
    successfulCount: number;
    failedCount: number;
    ignoredCount: number;
    abortedCount: number;
    skippedCount: number;
    resourcesDuration: number;
    completed: boolean;
    closed: boolean;

    constructor(opts: any = {}) {
        super(opts);

        this.testSuiteName = opts.testSuiteName || '';
        this.totalCount = opts.totalCount || 0;
        this.successfulCount = opts.successfulCount || 0;
        this.failedCount = opts.failedCount || 0;
        this.ignoredCount = opts.ignoredCount || 0;
        this.abortedCount = opts.abortedCount || 0;
        this.skippedCount = opts.skippedCount || 0;
        this.resourcesDuration = opts.resourcesDuration || 0;
        this.completed = opts.completed || false;
        this.closed = opts.closed || false;
    }

    increaseTotalCount() {
        this.totalCount++;
    }

    increareSuccessfulCount() {
        this.successfulCount++;
        this.increaseTotalCount();
    }

    increaseFailedCount() {
        this.failedCount++;
        this.increaseTotalCount();
    }

    increaseSkippedCount() {
        this.skippedCount++;
        this.increaseTotalCount();
    }

    increaseAbortedCount() {
        this.abortedCount++;
        this.increaseTotalCount();
    }

    getContextInformation() {

        const baseContextInformation = super.getContextInformation();

        return {
            ...( baseContextInformation ? baseContextInformation : undefined ),
            domainName: this.applicationDomainName,
            operationName: this.testSuiteName,
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
        };
    }

    getAdditionalFinishTags() {
        return {
            [TestRunnerTags.TEST_SUITE_FAILED_COUNT]: this.failedCount,
            [TestRunnerTags.TEST_SUITE_TOTAL_COUNT]: this.totalCount,
            [TestRunnerTags.TEST_SUITE_ABORTED_COUNT]: this.abortedCount,
            [TestRunnerTags.TEST_SUITE_SKIPPED_COUNT]: this.skippedCount,
            [TestRunnerTags.TEST_SUITE_SUCCESSFUL_COUNT]: this.successfulCount,
            ...(this.timeout ? { [TestRunnerTags.TEST_TIMEOUT]: this.timeout } : undefined),
        };
    }

    protected initContextMode() {

        this.compatibleContextModes.push(ContextMode.GlobalMode);
    }
}
