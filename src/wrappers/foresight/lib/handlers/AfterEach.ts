import * as TestRunnerSupport from '../../TestRunnerSupport';
import ExecutionContextManager from '../../../../context/ExecutionContextManager';
import TestSuiteEvent from '../../model/TestSuiteEvent';
import { TestRunnerTags } from '../../model/TestRunnerTags';
import HandlerUtils from './utils/HandlerUtils';
import ThundraSpan from '../../../../opentracing/Span';
import ThundraLogger from '../../../../ThundraLogger';

let span: ThundraSpan;

const TEST_AFTER_EACH_OPERATION_NAME = 'afterEach';

/**
 * Start for handling afterEach event
 * @param event event
 */
export async function start(event: TestSuiteEvent) {

    ThundraLogger.debug('<AfterEach> Handling afterEach start event.');

    const context = ExecutionContextManager.get();
    if (!context) {

        ThundraLogger.debug('<AfterEach> Execution context can not be empty.');
        return;
    }

    span = HandlerUtils.createSpanForTest(TEST_AFTER_EACH_OPERATION_NAME, context);
    if (!span) {

        ThundraLogger.debug('<AfterEach> Span can not be empty.');
        return;
    }

    span.tags[TestRunnerTags.TEST_SUITE] = TestRunnerSupport.testSuiteName;
    span._initialized();
}

/**
 * Finish for handling afterEach event
 * @param event event
 */
export async function finish(event: TestSuiteEvent) {

    ThundraLogger.debug('<AfterEach> Handling AfterEach finish event.');

    if (!span) {

        ThundraLogger.debug('<AfterEach><finish process> Span can not be empty.');
        return;
    }

    span.tags[TestRunnerTags.TEST_NAME] = event.testName;

    HandlerUtils.finishSpanForTest(span, TestRunnerTags.TEST_AFTER_EACH_DURATION);
    span = null;
}
