import * as TestRunnerSupport from '../../TestRunnerSupport';
import ExecutionContextManager from '../../../../context/ExecutionContextManager';
import TestSuiteEvent from '../../model/TestSuiteEvent';
import ThundraSpan from '../../../../opentracing/Span';
import { TestRunnerTags } from '../../model/TestRunnerTags';
import HandlerUtils from './utils/HandlerUtils';
import ThundraLogger from '../../../../ThundraLogger';

let span: ThundraSpan;

const TEST_BEFORE_ALL_OPERATION_NAME = 'beforeAll';

/**
 * Start for handling beforeAll event
 * @param event event
 */
export async function start(event: TestSuiteEvent) {

    ThundraLogger.debug('<beforeAll> Handling beforeAll start event.');

    const context = ExecutionContextManager.get();
    if (!context) {

        ThundraLogger.debug('<beforeAll> Execution context can not be empty.');
        return;
    }

    span = HandlerUtils.createSpanForTest(TEST_BEFORE_ALL_OPERATION_NAME, context);
    if (!span) {

        ThundraLogger.debug('<beforeAll> Span can not be empty.');
        return;
    }

    span.tags[TestRunnerTags.TEST_SUITE] = TestRunnerSupport.testSuiteName;
    span._initialized();
}

/**
 * Finish for handling beforeAll event
 * @param event event
 */
export async function finish(event: TestSuiteEvent) {

    ThundraLogger.debug('<beforeAll> Handling beforeAll finish event.');

    HandlerUtils.finishSpanForTest(span, TestRunnerTags.TEST_BEFORE_ALL_DURATION);
}
