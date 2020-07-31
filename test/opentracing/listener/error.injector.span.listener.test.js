import ErrorInjectorSpanListener from '../../../dist/opentracing/listeners/ErrorInjectorSpanListener';
import ThundraTracer from '../../../dist/opentracing/Tracer';

describe('error injector span listener', () => {
    const tracer = new ThundraTracer({});

    it('should init default configurations if empty opt provided', () => {
        // Arrange
        const opt = {};
        
        //Act
        const listener = new ErrorInjectorSpanListener(opt);
     
        // Assert
        expect(listener.counter).toBe(0);
        expect(listener.injectCountFreq).toBe(listener.DEFAULT_INJECT_COUNT_FREQ);
        expect(listener.errorMessage).toBe(listener.DEFAULT_ERROR_MESSAGE);
        expect(listener.errorType).toBe(listener.DEFAULT_ERROR_TYPE);
        expect(listener.injectOnFinish).toBe(listener.DEFAULT_INJECT_ON_FINISH);
    });

    it('should inject error according to the error frequency', () => {
        // Arrange
        const opt = {
            injectCountFreq: 5,
        };
        const listener = new ErrorInjectorSpanListener(opt);
        const span = tracer.startSpan('test span');
        let injectedErrorCount = 0;

        // Act
        for (var i = 0; i < 50; i++) {
            try {
                listener.onSpanInitialized(span);
            } catch (err) {
                injectedErrorCount++;
            }
        }

        // Assert
        expect(injectedErrorCount).toBe(10);
    });

    it('should inject error with message and type', () => {
        // Arrange
        const opt = {
            injectCountFreq: 1000,
            errorType: 'MyError',
            errorMessage: 'This is an error!',
        };

        const listener = new ErrorInjectorSpanListener(opt);
        const span = tracer.startSpan('test span');

        // Act
        try {
            listener.onSpanInitialized(span);
            // eslint-disable-next-line no-empty
        } catch (err) {

        }

        // Assert
        expect(span.getTag('error')).toBeTruthy();
        expect(span.getTag('error.kind')).toBe('MyError');
        expect(span.getTag('error.message')).toBe('This is an error!');
        expect(span.getTag('error.code')).not.toBeTruthy();
        expect(span.getTag('error.stack')).toBeTruthy();
    });

    it('should inject error on span finish', () => {
        // Arrange
        const opt = {
            injectOnFinish: true
        };

        const listener = new ErrorInjectorSpanListener(opt);
        const span = tracer.startSpan('test span');

        // Act
        //onSpanStarted should not throw exception
        listener.onSpanInitialized(span);
        try {
            listener.onSpanFinished(span);
            // eslint-disable-next-line no-empty
        } catch (err) {
        }

        // Assert
        expect(span.getTag('error')).toBeTruthy();
    });

    it('should invoke call back when callback is passed', () => {
        // Arrange
        const opt = {};

        const listener = new ErrorInjectorSpanListener(opt);
        const span = tracer.startSpan('test span');
        const callback = jest.fn();
        const args = ['argument1', 1];
        // Act    
        listener.onSpanInitialized(span, this, callback, args);

        // Assert
        expect(listener.counter).toBe(1);
        expect(callback).toBeCalledWith(new Error(listener.DEFAULT_ERROR_MESSAGE));
    });
});
