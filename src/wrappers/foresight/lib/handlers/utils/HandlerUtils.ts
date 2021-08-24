import ExecutionContext from "../../../../../context/ExecutionContext";
import ExecutionContextManager from "../../../../../context/ExecutionContextManager";
import ThundraSpan from "../../../../../opentracing/Span";

export default class HandlerUtils {

    static createSpanForTest(operationName: string, context: ExecutionContext) {
        const { tracer } = context;

        if (!tracer) {
            /**
             * log & return
             */
    
            return;
        }
    
        const {
            domainName,
            className
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
            /**
             * log & return
             */
    
            return;
        }

        span.close();

        const context = ExecutionContextManager.get();
        if (!context || !context.invocationData) {
            /**
             * log and return
             */
            
            return;
        }

        const { invocationData } = context;
        if (invocationData) {
            let duration = span.getDuration();

            let currentDuration = invocationData.tags[tagName];
            duration = duration + (currentDuration ? currentDuration : 0);
    
            invocationData.tags[tagName] = duration;
        }
    }
}