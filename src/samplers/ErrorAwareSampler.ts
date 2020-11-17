import ThundraSpan from '../opentracing/Span';
import InvocationData from '../plugins/data/invocation/InvocationData';
import InvocationSupport from '../plugins/support/InvocationSupport';

import Sampler from './Sampler';

/**
 * {@link Sampler} implementation which samples
 * if the invocation is erroneous
 */
class ErrorAwareSampler implements Sampler<InvocationData | ThundraSpan> {
    /**
     * @inheritDoc
     */
    isSampled(arg?: InvocationData | ThundraSpan): boolean {
        if (arg instanceof InvocationData) {
            const invocationData: InvocationData = arg as InvocationData;
            return invocationData.erroneous;
        } else if (arg instanceof ThundraSpan) {
            const span: ThundraSpan = arg as ThundraSpan;
            return span.hasErrorTag();
        } else {
            return InvocationSupport.hasError();
        }
    }
}

export default ErrorAwareSampler;
