import { JEST_TEST_EVENTS } from '../../../../../Constants';

import setup from './Setup';
import teardown from './Teardown';
import testStart from './TestStart';
import testDone from './TestDone';
import testSkip from './TestSkip';
import beforeEach from './BeforeEach';
import afterEach from './AfterEach';
import beforeAll from './BeforeAll';
import afterAll from './AfterAll';

const JestEventHandlers = new Map<string, Function>([
    [JEST_TEST_EVENTS.SETUP, setup],
    [JEST_TEST_EVENTS.TEARDOWN, teardown],
    [JEST_TEST_EVENTS.TESTSTART, testStart],
    [JEST_TEST_EVENTS.TESTDONE, testDone],
    [JEST_TEST_EVENTS.TESTSKIP, testSkip],
    [JEST_TEST_EVENTS.BEFOREEACH, beforeEach],
    [JEST_TEST_EVENTS.AFTEREACH, afterEach],
    [JEST_TEST_EVENTS.BEFOREALL, beforeAll],
    [JEST_TEST_EVENTS.AFTERALL, afterAll],

    /**
     * todo: add other event handlers like before each, after each ...
     */
])

export default JestEventHandlers;