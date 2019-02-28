import ThundraSpanListener from './ThundraSpanListener';
import SpanFilterer from './SpanFilterer';
import ThundraSpan from '../../opentracing/Span';
import { LISTENERS } from '../../Constants';
import ThundraLogger from '../../ThundraLogger';
import StandardSpanFilterer from './StandardSpanFilterer';
import SpanFilter from './SpanFilter';

class FilteringSpanListener implements ThundraSpanListener {
    private listener: ThundraSpanListener;
    private spanFilterer: SpanFilterer;

    constructor(opt: any = {}) {
        if (!opt.listener) {
            return;
        }

        try {
            this.listener = this._getListenerFromConfig(opt);
            this.spanFilterer = new StandardSpanFilterer(this._getSpanFiltererFromConfig(opt));
        } catch (err) {
            ThundraLogger.getInstance().error(
                `Cannot parse span listener config with reason: ${err.message}`);
        }
    }

    onSpanStarted(span: ThundraSpan, me?: any, callback?: () => any, args?: any[]): boolean {
        if (this.spanFilterer.accept(span)) {
            return this.listener.onSpanStarted(span, me, callback, args);
        }

        return false;
    }

    onSpanFinished(span: ThundraSpan, me?: any, callback?: () => any, args?: any[]): boolean {
        if (this.spanFilterer.accept(span)) {
            this.listener.onSpanFinished(span, me, callback, args);
            return true;
        }

        return false;
    }

    failOnError(): boolean {
        return this.listener.failOnError();
    }

    private _getListenerFromConfig(opt: any): ThundraSpanListener {
        const listenerClass = LISTENERS[opt.listener];
        if (!listenerClass) {
            throw new Error('No listener found with name: ' + opt.listener);
        }

        const listenerConfigs: any = {};
        for (const key of Object.keys(opt)) {
            if (key.startsWith('config.')) {
                const value = opt[key];
                const configName = key.substring('config.'.length, key.length);
                listenerConfigs[configName] = value;
            }
        }

        return new listenerClass(listenerConfigs);
    }

    private _getSpanFiltererFromConfig(opt: any): SpanFilter[] {
        const spanFilters: SpanFilter[] = [];
        const filterConfigs = this._getFiltererConfigs(opt);
        for (const key of Object.keys(filterConfigs)) {
            const filterConfig = filterConfigs[key];
            const domainName = filterConfig.domainName;
            const className = filterConfig.className;
            const operationName = filterConfig.operationName;
            const tags: any = {};

            for (const configKey of Object.keys(filterConfig)) {
                if (configKey.startsWith('tag.')) {
                    const value = filterConfig[configKey];
                    const configName = configKey.substring('tag.'.length, configKey.length);
                    if (isNaN(parseFloat(value))) {
                        if (value === 'true' || value === 'false') {
                            tags[configName] = value === 'true' ? true : false;
                        } else {
                            tags[configName] = value;
                        }
                    } else {
                        tags[configName] = parseFloat(value);
                    }
                }
            }

            spanFilters.push(new SpanFilter(domainName, className, operationName, tags));
        }

        return spanFilters;
    }

    private _getFiltererConfigs(opt: any): any {
        const filterConfigs: any = {};

        for (const key of Object.keys(opt)) {
            if (key.startsWith('filter')) {
                const value = opt[key];
                const separator = key.indexOf('.');
                if (separator > 0) {
                    const filterId = key.substring(0, separator + 1);
                    let filterConfig = filterConfigs[filterId];
                    if (!filterConfig) {
                        filterConfig = {};
                        filterConfigs[filterId] = filterConfig;
                    }
                    // Cannot add more than 10 filters but it is ok for now.
                    const filterPropName = key.substring(separator + 1, key.length);
                    filterConfig[filterPropName] = value;
                }
            }
        }

        return filterConfigs;
    }
}

export default FilteringSpanListener;
