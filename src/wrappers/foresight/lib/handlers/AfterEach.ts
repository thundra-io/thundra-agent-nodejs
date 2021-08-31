import * as TestRunnerSupport from '../../TestRunnerSupport';
import ExecutionContextManager from '../../../../context/ExecutionContextManager';
import TestSuiteEvent from '../../model/TestSuiteEvent';
import { TestRunnerTags } from '../../model/TestRunnerTags';
import HandlerUtils from './utils/HandlerUtils';
import ThundraSpan from '../../../../opentracing/Span';

let span: ThundraSpan;

const TEST_AFTER_EACH_OPERATION_NAME = 'afterEach';

export async function start(event: TestSuiteEvent) {

    const context = ExecutionContextManager.get();
    if (!context) {
        /**
         * log & return
         */

        return;
    }

    span = HandlerUtils.createSpanForTest(TEST_AFTER_EACH_OPERATION_NAME, context);
    if (!span) {
        /**
         * log & return
         */

        return;
    }

    span.tags[TestRunnerTags.TEST_SUITE] = TestRunnerSupport.testSuiteName;
    span._initialized();
}

export async function finish(event: TestSuiteEvent) {

    if (!span) {
        /**
         * log & return
         */

        return;
    }

    span.tags[TestRunnerTags.TEST_NAME] = event.testName;

    HandlerUtils.finishSpanForTest(span, TestRunnerTags.TEST_AFTER_EACH_DURATION);
}
