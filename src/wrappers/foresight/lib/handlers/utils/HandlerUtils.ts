import ExecutionContext from '../../../../../context/ExecutionContext';
import ExecutionContextManager from '../../../../../context/ExecutionContextManager';
import ThundraSpan from '../../../../../opentracing/Span';
import ThundraLogger from '../../../../../ThundraLogger';

/**
 * Util class for test suite event handlers.
 */
export default class HandlerUtils {

    static createSpanForTest(operationName: string, context: ExecutionContext) {
        const { tracer } = context;

        if (!tracer) {

            ThundraLogger.debug('<HandlerUtils> Tracer can not be empty.');
            return;
        }

        const {
            domainName,
            className,
        }: any = context.getContextInformation();

        const parentSpan = tracer.getActiveSpan();

        return tracer._startSpan(operationName, {
            childOf: parentSpan,
            domainName,
            className,
            disableActiveStart: true,
        });
    }

    static finishSpanForTest(span: ThundraSpan, tagName: string) {
        if (!span) {

            ThundraLogger.debug('<HandlerUtils> Span can not be empty.');
            return;
        }

        span.close();

        const context = ExecutionContextManager.get();
        if (!context || !context.invocationData) {

            ThundraLogger.debug('<HandlerUtils> Execution context can not be empty.');
            return;
        }

        const { invocationData } = context;
        if (invocationData) {
            let duration = span.getDuration();

            const currentDuration = invocationData.tags[tagName];
            duration = duration + (currentDuration ? currentDuration : 0);

            invocationData.tags[tagName] = duration;
        }
    }
}
