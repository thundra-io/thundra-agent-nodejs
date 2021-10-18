import { JEST_TEST_EVENTS } from '../../../../Constants';

import setup from './Setup';
import teardown from './Teardown';
import testStart from './TestStart';
import testDone from './TestDone';
import testSkip from './TestSkip';
import { start as beforeEachStart, finish as beforeEachFinish } from './BeforeEach';
import { start as afterEachStart, finish as afterEachFinish } from './AfterEach';
import { start as beforeAllStart, finish as beforeAllFinish } from './BeforeAll';
import { start as afterAllStart, finish as afterAllFinish } from './AfterAll';

export const JestEventHandlers = new Map<string, Function>([
    [JEST_TEST_EVENTS.SETUP, setup],
    [JEST_TEST_EVENTS.TEARDOWN, teardown],
    [JEST_TEST_EVENTS.TESTSTART, testStart],
    [JEST_TEST_EVENTS.TESTDONE, testDone],
    [JEST_TEST_EVENTS.TESTSKIP, testSkip],
    [JEST_TEST_EVENTS.BEFOREEACHSTART, beforeEachStart],
    [JEST_TEST_EVENTS.BEFOREEACHFINISH, beforeEachFinish],
    [JEST_TEST_EVENTS.AFTEREACHSTART, afterEachStart],
    [JEST_TEST_EVENTS.AFTEREACHFINISH, afterEachFinish],
    [JEST_TEST_EVENTS.BEFOREALLSTART, beforeAllStart],
    [JEST_TEST_EVENTS.BEFOREALLFINISH, beforeAllFinish],
    [JEST_TEST_EVENTS.AFTERALLSTART, afterAllStart],
    [JEST_TEST_EVENTS.AFTERALLFINISH, afterAllFinish],
]);

/**
 * todo: add other test frameworks handler router map here ...
 */
