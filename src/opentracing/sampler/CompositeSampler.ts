import Sampler from './Sampler';

class CompositeSampler implements Sampler<any> {
    private samplers: Array<Sampler<any>>;
    private operator: SamplerCompositionOperator;

    constructor(samplers: Array<Sampler<any>>, operator?: SamplerCompositionOperator) {
        this.samplers =  samplers;
        this.operator = operator === undefined ? SamplerCompositionOperator.OR : operator;
    }

    isSampled(arg?: any): boolean {
        if (this.operator === SamplerCompositionOperator.AND) {
            let isSampled: boolean = true;
            for (const sampler of this.samplers) {
                isSampled = sampler.isSampled(arg) && isSampled;
            }
            return isSampled;
        } else {
            let isSampled: boolean = false;
            for (const sampler of this.samplers) {
                isSampled = sampler.isSampled(arg) || isSampled;
            }
            return isSampled;
        }
    }
}

export enum SamplerCompositionOperator {
    AND,
    OR,
}

export default CompositeSampler;
