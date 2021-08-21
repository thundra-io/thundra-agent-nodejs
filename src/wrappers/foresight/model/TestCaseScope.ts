import { TEST_STATUS } from '../../Constants';

export default class TestCaseScope {
    id: string;
    name: string;
    method: string;
    testClass: string;
    status: TEST_STATUS;

    constructor(    
        id: string,
        name: string,
        method: string,
        testClass: string) {
            
            this.id = id;
            this.name = name;
            this.method = method;
            this.testClass = testClass;
    }
}