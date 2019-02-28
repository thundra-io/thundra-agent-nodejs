import ThundraTracer from '../../../dist/opentracing/Tracer';
import Utils from '../../../dist/plugins/utils/Utils';

describe('Thundra Tracer', () => {

    it('Should read listener config from environment variable with multiple filters and listener', () => {
        // Arrange
        const tracer = new ThundraTracer({});

        process.env['thundra_agent_lambda_trace_span_listener'] = 'FilteringSpanListener[listener=LatencyInjectorSpanListener,config.delay=370,'+
        'config.injectOnFinish=true,config.randomizeDelay=true,'+
        'filter1.className=AWS-SQS,filter1.domainName=Messaging,filter1.tag.foo=bar,' +
        'filter2.className=HTTP,filter2.operationName=http_request,filter2.tag.http.host=foobar.com]';

        //Act
        const listeners = Utils.registerSpanListenersFromConfigurations(tracer);
        
        //Assert
        expect(listeners.length).toBe(1);
        
        const listener = listeners[0];
    
        expect(listener.listener).toBeTruthy();
        expect(listener.spanFilterer).toBeTruthy();
        expect(listener.onSpanStarted).toBeTruthy();
        expect(listener.onSpanFinished).toBeTruthy();

        expect(listener.listener.delay).toBe(370);
        expect(listener.listener.randomizeDelay).toBe(true);
        expect(listener.listener.injectOnFinish).toBe(true);
        
        expect(listener.spanFilterer.spanFilters.length).toBe(2);  
        
        expect(listener.spanFilterer.spanFilters[0].domainName).toBe('Messaging');       
        expect(listener.spanFilterer.spanFilters[0].className).toBe('AWS-SQS');   
        expect(listener.spanFilterer.spanFilters[0].getTag('foo')).toBe('bar');    
        
        expect(listener.spanFilterer.spanFilters[1].operationName).toBe('http_request');       
        expect(listener.spanFilterer.spanFilters[1].className).toBe('HTTP');   
        expect(listener.spanFilterer.spanFilters[1].getTag('http.host')).toBe('foobar.com');

        process.env['thundra_agent_lambda_trace_span_listener'] = null;
    });

    it('Should read listener config from environment variable with multiple filters and listener', () => {

        // Arrange
        const tracer = new ThundraTracer({});

        process.env['thundra_agent_lambda_trace_span_listener'] = 'FilteringSpanListener[listener=ErrorInjectorSpanListener,config.errorType=NameError,' + 
        'config.errorMessage="foo",config.injectOnFinish=true,config.injectCountFreq=3,' + 
        'filter.className=AWS-SQS,filter.domainName=Messaging,filter.tag.foo=bar]';

        //Act
        const listeners = Utils.registerSpanListenersFromConfigurations(tracer);
        
        //Assert
        expect(listeners.length).toBe(1);
        
        const listener = listeners[0];
    
        expect(listener.listener).toBeTruthy();
        expect(listener.spanFilterer).toBeTruthy();
        expect(listener.onSpanStarted).toBeTruthy();
        expect(listener.onSpanFinished).toBeTruthy();

        expect(listener.listener.injectCountFreq).toBe(3);
        expect(listener.listener.injectOnFinish).toBe(true);
        expect(listener.listener.errorType).toBe('NameError');
        expect(listener.listener.errorMessage).toBe('foo');
        
        expect(listener.spanFilterer.spanFilters.length).toBe(1);  
        
        expect(listener.spanFilterer.spanFilters[0].domainName).toBe('Messaging');       
        expect(listener.spanFilterer.spanFilters[0].className).toBe('AWS-SQS');   
        expect(listener.spanFilterer.spanFilters[0].getTag('foo')).toBe('bar');    
        

        process.env['thundra_agent_lambda_trace_span_listener'] = null;
        tracer.destroy();
    });

    it('Should not add invalid listener', () => {

        // Arrange
        const tracer = new ThundraTracer({});

        process.env['thundra_agent_lambda_trace_span_listener'] = 'InvalidSpanListener[]';

        //Act
        const listeners = Utils.registerSpanListenersFromConfigurations(tracer);
        
        //Assert
        expect(listeners.length).toBe(0);
       
        process.env['thundra_agent_lambda_trace_span_listener'] = null;
        tracer.destroy();
    });
});   
