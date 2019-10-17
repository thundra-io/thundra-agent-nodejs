import ThundraSpanListener from './ThundraSpanListener';
import SpanFilterer from './SpanFilterer';
import ThundraSpan from '../../opentracing/Span';
import { LISTENERS } from '../../Constants';
import ThundraLogger from '../../ThundraLogger';
import StandardSpanFilterer from './StandardSpanFilterer';
import SpanFilter from './SpanFilter';

const get = require('lodash.get');

class FilteringSpanListener implements ThundraSpanListener {
    private listener: ThundraSpanListener;
    private spanFilterer: SpanFilterer;
    private all: boolean;

    constructor(opt: any = {}) {
        if (!opt.listener) {
            return;
        }

        try {
            this.all = get(opt, 'all', false);
            this.listener = this._getListenerFromConfig(opt);
            this.spanFilterer = new StandardSpanFilterer(this._getSpanFiltererFromConfig(opt), this.all);
        } catch (err) {
            ThundraLogger.getInstance().error(
                `Cannot parse span listener config with reason: ${err.message}`);
        }
    }

    onSpanStarted(span: ThundraSpan, me?: any, callback?: () => any, args?: any[], callbackAlreadyCalled?: boolean): boolean {
        if (this.spanFilterer.accept(span)) {
            return this.listener.onSpanStarted(span, me, callback, args, callbackAlreadyCalled);
        }

        return false;
    }

    onSpanFinished(span: ThundraSpan, me?: any, callback?: () => any, args?: any[], callbackAlreadyCalled?: boolean): boolean {
        if (this.spanFilterer.accept(span)) {
            this.listener.onSpanFinished(span, me, callback, args, callbackAlreadyCalled);
            return true;
        }

        return false;
    }

    failOnError(): boolean {
        return this.listener.failOnError();
    }

    private _getListenerFromConfig(opt: any): ThundraSpanListener {
        const listenerType = get(opt, 'listener.type', '');
        const listenerClass = LISTENERS[listenerType];
        if (!listenerClass) {
            throw new Error('No listener found with name: ' + listenerType);
        }

        const listenerConfig: any = get(opt, 'listener.config', {});
        return new listenerClass(listenerConfig);
    }

    private _getSpanFiltererFromConfig(opt: any): SpanFilter[] {
        const spanFilters: SpanFilter[] = [];
        for (const filterConfig of opt.filters) {
            spanFilters.push(new SpanFilter(filterConfig));
        }

        return spanFilters;
    }
}

export default FilteringSpanListener;
