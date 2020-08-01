import ThundraSpanListener from './ThundraSpanListener';
import ThundraSpan from '../Span';
import { LISTENERS } from '../../Constants';
import ThundraLogger from '../../ThundraLogger';
import SpanFilter from './SpanFilter';
import SpanFilterer from './SpanFilterer';
import StandardSpanFilter from './StandardSpanFilter';
import CompositeSpanFilter from './CompositeSpanFilter';
import StandardSpanFilterer from './StandardSpanFilterer';

const get = require('lodash.get');

/**
 * {@link ThundraSpanListener} implementation which filters span to notify
 * according to given {@link SpanFilter}s
 */
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
            ThundraLogger.error(
                `Cannot parse span listener config with reason: ${err.message}`);
        }
    }

    /**
     * @inheritDoc
     */
    onSpanStarted(span: ThundraSpan, me?: any, callback?: () => any, args?: any[], callbackAlreadyCalled?: boolean): boolean {
        return false;
    }

    /**
     * @inheritDoc
     */
    onSpanInitialized(span: ThundraSpan, me?: any, callback?: () => any, args?: any[], callbackAlreadyCalled?: boolean): boolean {
        if (this.spanFilterer && this.spanFilterer.accept(span)) {
            return this.listener.onSpanInitialized(span, me, callback, args, callbackAlreadyCalled);
        }

        return false;
    }

    /**
     * @inheritDoc
     */
    onSpanFinished(span: ThundraSpan, me?: any, callback?: () => any, args?: any[], callbackAlreadyCalled?: boolean): boolean {
        if (this.spanFilterer && this.spanFilterer.accept(span)) {
            return this.listener.onSpanFinished(span, me, callback, args, callbackAlreadyCalled);
        }

        return false;
    }

    /**
     * @inheritDoc
     */
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
            const composite = get(filterConfig, 'composite', false);

            if (composite) {
                const compositeFilter = new CompositeSpanFilter(filterConfig);
                const filters = this._getSpanFiltererFromConfig(filterConfig);

                compositeFilter.setFilters(filters);
                spanFilters.push(compositeFilter);
            } else {
                spanFilters.push(new StandardSpanFilter(filterConfig));
            }
        }

        return spanFilters;
    }

}

export default FilteringSpanListener;
