import Utils from '../../..//utils/Utils';

import * as TestRunnerSupport from '../TestRunnerSupport';

export default class TestSuiteEvent {

    id: string;
    name: string;
    testSuiteName: string;
    orginalEvent: any;

    constructor(
        id: string,
        name: string,
        testSuiteName: string,
        orginalEvent: any,
    ){
        this.id = id;
        this.name = name;
        this.testSuiteName = testSuiteName;
        this.orginalEvent = orginalEvent;
    }

    static builder(){
        return new TestSuiteEvent.TestSuiteEventBuilder();
    }

    static TestSuiteEventBuilder = class { 

        id: string;
        name: string;
        testSuiteName: string;
        orginalEvent: any;

        withId(id: string) {
            this.id = id;
            return this;
        }

        withName(name: string) {
            this.name = name;
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
                this.orginalEvent || {}
            )
        }
    }
}