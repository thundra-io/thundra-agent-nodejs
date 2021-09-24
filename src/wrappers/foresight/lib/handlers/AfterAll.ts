import * as TestRunnerSupport from '../../TestRunnerSupport';
import ExecutionContextManager from '../../../../context/ExecutionContextManager';
import TestSuiteEvent from '../../model/TestSuiteEvent';
import ThundraSpan from '../../../../opentracing/Span';
import { TestRunnerTags } from '../../model/TestRunnerTags';
import HandlerUtils from './utils/HandlerUtils';
import ThundraLogger from '../../../../ThundraLogger';

let span: ThundraSpan;

const TEST_AFTER_ALL_OPERATION_NAME = 'afterAll';

/**
 * Start for handling afterAll event
 * @param event event
 */
export async function start(event: TestSuiteEvent) {

    ThundraLogger.debug('<AfterAll> Handling afterAll start event.');

    const context = TestRunnerSupport.testSuiteExecutionContext;
    if (!context) {

        ThundraLogger.debug('<AfterAll> Execution context can not be empty.');
        return;
    }

    ExecutionContextManager.set(context);

    span = HandlerUtils.createSpanForTest(TEST_AFTER_ALL_OPERATION_NAME, context);
    if (!span) {

        ThundraLogger.debug('<AfterAll> Span can not be empty.');
        return;
    }

    span.tags[TestRunnerTags.TEST_SUITE] = TestRunnerSupport.testSuiteName;
    span._initialized();
}

/**
 * Finish for handling afterAll event
 * @param event event
 */
export async function finish(event: TestSuiteEvent) {

    ThundraLogger.debug('<AfterAll> Handling afterAll finish event.');

    const context = TestRunnerSupport.testSuiteExecutionContext;
    if (!context) {

        ThundraLogger.debug('<AfterAll> Execution context can not be empty.');
        return;
    }

    ExecutionContextManager.set(context);

    if (span) {
        HandlerUtils.finishSpanForTest(span, TestRunnerTags.TEST_AFTER_ALL_DURATION, context);
        span = null;
    }
}
