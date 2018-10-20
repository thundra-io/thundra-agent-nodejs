import Sampler from './Sampler';
import ThundraSpan from '../Span';

class ErrorAwareSampler implements Sampler<ThundraSpan> {
    isSampled(span: ThundraSpan): boolean {
        if (span) {
            return span.getTag('error') === true;
        } else {
            return false;
        }
    }
}

export default ErrorAwareSampler;
