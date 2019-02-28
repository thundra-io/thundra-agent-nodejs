import FilteringSpanListener from '../../../dist/plugins/listeners/FilteringSpanListener';
import ErrorInjectorSpanListener from '../../../dist/plugins/listeners/ErrorInjectorSpanListener';
import StandardSpanFilterer from '../../../dist/plugins/listeners/StandardSpanFilterer';
import SpanFilter from '../../../dist/plugins/listeners/SpanFilter';
import ThundraSpan from '../../../dist/opentracing/Span';

describe('FilteringSpanListener', () => {

    it('Should call function callback if filter matches and not call if it does not', () => {
        // Arrange
        const filteringListener = new FilteringSpanListener();

        filteringListener.listener = new ErrorInjectorSpanListener();

        filteringListener.spanFilterer = new StandardSpanFilterer();

        const filter =  new SpanFilter();
        filter.className = 'HTTP';
        filteringListener.spanFilterer.addFilter(filter);

        const matchingSpan = new ThundraSpan();
        matchingSpan.className = 'HTTP';
        const matchingCallback = jest.fn();

        const nonMatchingSpan = new ThundraSpan();
        nonMatchingSpan.className = 'AWS-SQS';
        const nonMatchingCallback = jest.fn();
        
        //Act
        filteringListener.onSpanStarted(matchingSpan, this, matchingCallback, [2, 'value']);
        const callbackCalled = filteringListener.onSpanStarted(nonMatchingSpan, this, nonMatchingCallback, [2, 'value']);
        
        // Assert
        expect(matchingCallback).toBeCalledWith(new Error(filteringListener.listener.DEFAULT_ERROR_MESSAGE));
        expect(callbackCalled).toBe(false);
    });
});
