import InvocationSupport from '../../plugins/support/InvocationSupport';
import Sampler from './Sampler';

class ErrorAwareSampler implements Sampler<null> {
    isSampled(): boolean {
        return InvocationSupport.hasError();
    }
}

export default ErrorAwareSampler;
