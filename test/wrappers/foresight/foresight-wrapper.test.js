/**
* @jest-environment ./test/wrappers/foresight/environment/thundra-environment
*/

const path = require('path');

import {
    TEST_STATUS
} from '../../../dist/Constants';

describe('Foresight Wrapper Tests', () => {

    const mockTestRunId = 'MOCK_TEST_RUN_ID';

    const timeoutErrorMessage = 'exceeded timeout';

    let testRunnerSupport;

    let sendReportSpy;
    let setTestCaseContextSpy;

    const testCounts = {
        totalCount: 1, // start with skipped count
        successfulCount: 0,
        failedCount: 0,
        abortedCount: 0,
        skippedCount: 1 // only one skipped test case in this file
    };

    let afterTestStatus;

    const increaseTotalCount = () => {
        testCounts.totalCount = testCounts.totalCount + 1; 
    }

    const increaseSuccessfulCount = () => {
        increaseTotalCount();
        testCounts.successfulCount = testCounts.successfulCount + 1; 
        afterTestStatus = TEST_STATUS.SUCCESSFUL;
    }

    const increaseFailedCount = () => {
        increaseTotalCount();
        testCounts.failedCount = testCounts.failedCount + 1; 
        afterTestStatus = TEST_STATUS.FAILED;
    }

    const increaseAbortedCount = () => {
        increaseTotalCount();
        testCounts.abortedCount = testCounts.abortedCount + 1; 
        afterTestStatus = TEST_STATUS.ABORTED;
    }

    beforeAll(async () => {   
        testRunnerSupport = global.__THUNDRA__.testRunnerSupport;

        sendReportSpy = jest.spyOn(testRunnerSupport.wrapperContext.reporter, 'sendReports');
        setTestCaseContextSpy = jest.spyOn(testRunnerSupport, 'setTestCaseContext');
    });
    
    afterAll(() => {

        expect(sendReportSpy).toBeCalled();

        expect(testRunnerSupport.testSuiteExecutionContext.totalCount).toBe(testCounts.totalCount);
        expect(testRunnerSupport.testSuiteExecutionContext.successfulCount).toBe(testCounts.successfulCount);
        expect(testRunnerSupport.testSuiteExecutionContext.failedCount).toBe(testCounts.failedCount);
        expect(testRunnerSupport.testSuiteExecutionContext.abortedCount).toBe(testCounts.abortedCount);
        expect(testRunnerSupport.testSuiteExecutionContext.skippedCount).toBe(testCounts.skippedCount);
    });
    
    beforeEach(() => {
    });

    afterEach(() => {
      
        if (afterTestStatus === TEST_STATUS.SUCCESSFUL) {
            expect(setTestCaseContextSpy).toBeCalled();
        }
    });

    it('Verify Wrapper Context Created', () => {

        expect(testRunnerSupport.wrapperContext).toBeTruthy();
        increaseSuccessfulCount();
    });

    it('Verify Test Suite Execution Context Created', () => {

        expect(testRunnerSupport.testSuiteExecutionContext).toBeTruthy();
        increaseSuccessfulCount();
    });

    it('Verify Test Case Execution Context Created', () => {

        expect(testRunnerSupport.testCaseExecutionContext).toBeTruthy();
        increaseSuccessfulCount();
    });

    it('Verify Test Run Id', () => {

        expect(testRunnerSupport.testRunScope).toBeTruthy();
        expect(testRunnerSupport.testRunScope.id).toBe(mockTestRunId);
        increaseSuccessfulCount();
    });

    it('Verify Test Suite Name', () => {

        const testSuiteName = 'wrappers/foresight/foresight-wrapper.test.js';
        expect(testRunnerSupport.testSuiteName).toBe(testSuiteName);
        increaseSuccessfulCount();
    });

    it('Test Will Aborted. (will be failed)', () => {

        increaseFailedCount();
        throw new Error(timeoutErrorMessage);
    });

    it('Test Will Failed. (will be failed)', (done) => {

        increaseAbortedCount();
        throw new Error('This is the error');
    });

    test.skip('Test will be skipped', () => {
        expect(inchesOfSnow()).toBe(0);
    });
});