import * as TestRunnerSupport from '../../TestRunnerSupport';
import ExecutionContextManager from '../../../../context/ExecutionContextManager';
import TestSuiteEvent from '../../model/TestSuiteEvent';
import ThundraSpan from '../../../../opentracing/Span';
import { TestRunnerTags } from '../../model/TestRunnerTags';
import HandlerUtils from './utils/HandlerUtils';

let span: ThundraSpan;

const TEST_AFTER_ALL_OPERATION_NAME = "afterAll";

export async function start(event: TestSuiteEvent) {

    const context = ExecutionContextManager.get();
    if (!context) {
        /**
         * log & return
         */

        return;
    }

    span = HandlerUtils.createSpanForTest(TEST_AFTER_ALL_OPERATION_NAME, context);
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

    HandlerUtils.finishSpanForTest(span, TestRunnerTags.TEST_AFTER_ALL_DURATION);
}