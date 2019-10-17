import SpanFilterer from './SpanFilterer';
import ThundraSpan from '../../opentracing/Span';
import SpanFilter from './SpanFilter';

class StandardSpanFilterer implements SpanFilterer {
    private spanFilters: SpanFilter[];
    private all: boolean;

    constructor(spanFilters: SpanFilter[], all: boolean = false) {
        this.all = all;
        this.spanFilters = spanFilters ? spanFilters : [];
    }

    accept(span: ThundraSpan): boolean {
        if (!this.spanFilters || this.spanFilters.length === 0) {
            return true;
        }

        let result = this.all;

        for (const spanFilter of this.spanFilters) {
            if (this.all) {
                result = result && spanFilter.accept(span);
            } else {
                result = result || spanFilter.accept(span);
            }
        }
        return result;
    }

    addFilter(spanFilter: SpanFilter): void {
        this.spanFilters.push(spanFilter);
    }

    clearFilters(): void {
        this.spanFilters = [];
    }
}

export default StandardSpanFilterer;
