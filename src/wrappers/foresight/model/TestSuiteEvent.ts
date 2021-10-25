import Utils from '../../..//utils/Utils';

import * as TestRunnerSupport from '../TestRunnerSupport';

export default class TestSuiteEvent {

    static TestSuiteEventBuilder = class {

        id: string;
        name: string;
        testSuiteName: string;
        testName: string;
        testDuration: number;
        error: Error;
        timeout: boolean;
        orginalEvent: any;

        withId(id: string) {
            this.id = id;
            return this;
        }

        withName(name: string) {
            this.name = name;
            return this;
        }

        withTestName(testName: string) {
            this.testName = testName;
            return this;
        }

        withTestDuration(testDuration: number) {
            this.testDuration = testDuration;
            return this;
        }

        withTimeout(timeout: boolean) {
            this.timeout = timeout;
            return this;
        }

        withError(error: Error) {
            this.error = error;
            return this;
        }

        withTestSuiteName(testSuiteName: string) {
            this.testSuiteName = testSuiteName;
            return this;
        }

        withOrginalEvent(orginalEvent: any) {
            this.orginalEvent = orginalEvent;
            return this;
        }

        build() {
            return new TestSuiteEvent(
                this.id || Utils.generateId(),
                this.name || '',
                this.testSuiteName || TestRunnerSupport.testSuiteName,
                this.testName,
                this.testDuration,
                this.error,
                this.timeout,
                this.orginalEvent || {},
            );
        }
    };

    id: string;
    name: string;
    testSuiteName: string;
    testName: string;
    testDuration: number;
    error: Error;
    timeout: boolean;
    orginalEvent: any;

    constructor(
        id: string,
        name: string,
        testSuiteName: string,
        testName: string,
        testDuration: number,
        error: Error,
        timeout: boolean,
        orginalEvent: any,
    ) {
        this.id = id;
        this.name = name;
        this.testSuiteName = testSuiteName;
        this.testName = testName;
        this.testDuration = testDuration;
        this.error = error,
        this.timeout = timeout,
        this.orginalEvent = orginalEvent;
    }

    static builder() {
        return new TestSuiteEvent.TestSuiteEventBuilder();
    }

    hasError(): boolean {
        return this.error !== undefined;
    }
}
