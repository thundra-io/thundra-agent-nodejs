import Sampler from './Sampler';
import ThundraSpan from '../Span';

/**
 * {@link Sampler} implementation which samples {@link ThundraSpan}s
 * if their durations in milliseconds are in the allowed side (greater than or not)
 * according to given duration in milliseconds.
 */
class DurationAwareSampler implements Sampler<ThundraSpan> {

    private duration: number;
    private longerThan: boolean;

    constructor(duration: number, longerThan: boolean) {
        this.duration = duration;
        this.longerThan = longerThan;
    }

    /**
     * @inheritDoc
     */
    isSampled(span: ThundraSpan): boolean {
        if (span) {
            if (this.longerThan) {
                return span.getDuration() > this.duration;
            } else {
                return span.getDuration() <= this.duration;
            }
        } else {
            return false;
        }
    }

}

export default DurationAwareSampler;
