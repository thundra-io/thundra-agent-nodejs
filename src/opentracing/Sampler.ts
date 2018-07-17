import Span from './Span';

class ThundraSampler {
    rate: number;
    constructor (rate: number) {
      this.rate = rate;
    }

    isSampled(span: Span) {
      return this.rate === 1 || Math.random() < this.rate;
    }
  }

export default ThundraSampler;
