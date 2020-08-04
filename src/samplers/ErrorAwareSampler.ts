import InvocationSupport from '../plugins/support/InvocationSupport';
import Sampler from './Sampler';

/**
 * {@link Sampler} implementation which samples
 * if the invocation is erroneous
 */
class ErrorAwareSampler implements Sampler<null> {

    /**
     * @inheritDoc
     */
    isSampled(): boolean {
        return InvocationSupport.hasError();
    }

}

export default ErrorAwareSampler;
