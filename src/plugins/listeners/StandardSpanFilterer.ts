import SpanFilterer from './SpanFilterer';
import ThundraSpan from '../../opentracing/Span';
import SpanFilter from './SpanFilter';

class StandardSpanFilterer implements SpanFilterer {
    private spanFilters: SpanFilter[];

    constructor(spanFilters: SpanFilter[]) {
        this.spanFilters = spanFilters ? spanFilters : [];
    }

    accept(span: ThundraSpan): boolean {
        if (!this.spanFilters || this.spanFilters.length === 0) {
            return true;
        }

        for (const spanFilter of this.spanFilters) {
            if (spanFilter.accept(span)) {
                return true;
            }
        }
        return false;
    }

    addFilter(spanFilter: SpanFilter): void {
        this.spanFilters.push(spanFilter);
    }

    clearFilters(): void {
        this.spanFilters = [];
    }
}

export default StandardSpanFilterer;
