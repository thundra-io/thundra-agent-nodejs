/**
 * Module entry point for listeners
 */

import ErrorInjectorSpanListener from './ErrorInjectorSpanListener';
import FilteringSpanListener from './FilteringSpanListener';
import LatencyInjectorSpanListener from './LatencyInjectorSpanListener';
import TagInjectorSpanListener from './TagInjectorSpanListener';
import StandardSpanFilter from './StandardSpanFilter';
import CompositeSpanFilter from './CompositeSpanFilter';
import StandardSpanFilterer from './StandardSpanFilterer';

export default {
    ErrorInjectorSpanListener,
    FilteringSpanListener,
    LatencyInjectorSpanListener,
    TagInjectorSpanListener,
    StandardSpanFilter,
    CompositeSpanFilter,
    StandardSpanFilterer,
};
