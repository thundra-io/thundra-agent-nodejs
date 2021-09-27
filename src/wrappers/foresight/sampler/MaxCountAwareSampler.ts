import Sampler from '../../../samplers/Sampler';

/**
 * Sampler for check max count
 */
export default class MaxCountAwareSampler implements Sampler<null> {

    private count: number;
    private counter: number = 0;

    constructor(count: number) {
        this.count = count;
    }

    /**
     * @inheritDoc
     */
    isSampled(): boolean {

        this.counter++;
        return this.counter <= this.count;
    }
}
