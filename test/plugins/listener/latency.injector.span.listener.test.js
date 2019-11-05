import LatencyInjectorSpanListener from '../../../dist/plugins/listeners/LatencyInjectorSpanListener';
import ThundraSpan from '../../../dist/opentracing/Span';

describe('LatencyInjectorSpanListener', () => {

    it('Should init default configurations if empty opt provided', () => {
        // Arrange
        const opt = {};
        
        //Act
        const listener = new LatencyInjectorSpanListener(opt);
     
        // Assert
        expect(listener.injectOnFinish).toBe(false);
        expect(listener.delay).toBe(100);
        expect(listener.randomizeDelay).toBe(false);
    });


    it('Should init with valid options', () => {
        // Arrange
        const opt = {
            injectOnFinish: true,
            delay: 200,
            randomizeDelay: true,
        };
        
        //Act
        const listener = new LatencyInjectorSpanListener(opt);
     
        // Assert
        expect(listener.injectOnFinish).toBe(true);
        expect(listener.delay).toBe(200);
        expect(listener.randomizeDelay).toBe(true);
    });

    it('Should not call function callback before delay', (done) => {
        // Arrange
        const opt = {
            delay: 200
        };
        
        //Act
        const listener = new LatencyInjectorSpanListener(opt);
        const span = new ThundraSpan();
        const callback = jest.fn();
        listener.onSpanInitialized(span, this, callback, []);

        // Assert        
        setTimeout(() => {
            expect(callback).not.toBeCalled();
            done();
        }, 100);
    });

    it('Should call function callback after delay', (done) => {
        // Arrange
        const opt = {
            delay: 200
        };
        
        //Act
        const listener = new LatencyInjectorSpanListener(opt);
        const span = new ThundraSpan();
        const callback = jest.fn();
        listener.onSpanInitialized(span, this, callback, [2,'value']);

        // Assert        
        setTimeout(() => {
            expect(callback).toBeCalledWith(2,'value');
            done();
        }, 210);
    });
});
