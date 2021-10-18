import ExecutionContextManager from '../../../context/ExecutionContextManager';
import Factory from '../../../factory/Factory';
import Sampler from '../../../samplers/Sampler';

/**
 * Sampler for test
 */
export default class TestTraceAwareSampler<T> implements Sampler<T> {

    traceSamplerMap = new Map();

    samplerFactory: Factory<Sampler<T>>;

    constructor(samplerFactory: Factory<Sampler<T>>) {
       this.samplerFactory = samplerFactory;
    }

    /**
     * @inheritDoc
     */
    isSampled(arg?: T) {

        const context = ExecutionContextManager.get();
        if (!context || !context.traceId) {
            return false;
        }

        const traceId = context.traceId;

        let sampler = this.traceSamplerMap.get(traceId);
        if (sampler == null) {

            sampler = this.samplerFactory.create();
            this.traceSamplerMap.set(traceId, sampler);
        }

        return sampler.isSampled(arg);
    }
}
