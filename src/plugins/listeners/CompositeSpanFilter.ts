import ThundraSpan from '../../opentracing/Span';
import SpanFilter from './SpanFilter';

const get = require('lodash.get');

class CompositeSpanFilter {
    private composite: boolean;
    private all: boolean;
    private filters: SpanFilter[];

    constructor(config: any = {}) {
        this.composite = true;
        this.all = get(config, 'all', false);
        this.filters = [];
    }

    getFilters(): SpanFilter[] {
        return this.filters;
    }

    setFilters(filters: SpanFilter[]) {
        this.filters = filters;
    }

    accept(span: ThundraSpan): boolean {
        if (!this.filters || this.filters.length === 0) {
            return true;
        }

        let result = this.all;

        for (const filter of this.filters) {
            if (this.all) {
                result = result && filter.accept(span);
            } else {
                result = result || filter.accept(span);
            }
        }

        return result;
    }
}

export default CompositeSpanFilter;
