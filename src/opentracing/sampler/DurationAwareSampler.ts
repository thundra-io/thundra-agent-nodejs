import Sampler from './Sampler';
import ThundraSpan from '../Span';

class DurationAwareSampler implements Sampler<ThundraSpan> {
    duration: number;
    longerThan: boolean;

    constructor(duration: number, longerThan: boolean) {
        this.duration = duration;
        this.longerThan = longerThan;
    }

    isSampled(span: ThundraSpan): boolean {
        if (span) {
            if (this.longerThan) {
                return span.duration > this.duration;
            } else {
                return span.duration <= this.duration;
            }
        } else {
            return false;
        }
    }
}

export default DurationAwareSampler;
