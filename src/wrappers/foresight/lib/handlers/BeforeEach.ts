import * as TestRunnerSupport from '../../TestRunnerSupport';
import ExecutionContextManager from '../../../../context/ExecutionContextManager';
import TestSuiteEvent from '../../model/TestSuiteEvent';
import ThundraSpan from '../../../../opentracing/Span';
import { TestRunnerTags } from '../../model/TestRunnerTags';
import HandlerUtils from './utils/HandlerUtils';
import ThundraLogger from '../../../../ThundraLogger';

let span: ThundraSpan;

const TEST_BEFORE_EACH_OPERATION_NAME = 'beforeEach';

/**
 * Start for handling beforeEach event
 * @param event event
 */
export async function start(event: TestSuiteEvent) {

    ThundraLogger.debug('<BeforeEach> Handling beforeEach start event.');

    const context = ExecutionContextManager.get();
    if (!context) {

        ThundraLogger.debug('<BeforeEach> Execution context can not be empty.');
        return;
    }

    span = HandlerUtils.createSpanForTest(TEST_BEFORE_EACH_OPERATION_NAME, context);
    if (!span) {

        ThundraLogger.debug('<BeforeEach> Span can not be empty.');
        return;
    }

    span.tags[TestRunnerTags.TEST_SUITE] = TestRunnerSupport.testSuiteName;

    span._initialized();
}

/**
 * Finish for handling beforeEach event
 * @param event event
 */
export async function finish(event: TestSuiteEvent) {

    ThundraLogger.debug('<BeforeEach> Handling beforeEach finish event.');

    if (!span) {

        ThundraLogger.debug('<BeforeEach><finish process> Span can not be empty.');
        return;
    }

    span.tags[TestRunnerTags.TEST_NAME] = event.testName;

    HandlerUtils.finishSpanForTest(span, TestRunnerTags.TEST_BEFORE_EACH_DURATION);
}
