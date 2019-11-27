import ThundraTracer from '../../../dist/opentracing/Tracer';
import Utils from '../../../dist/plugins/utils/Utils';
import {envVariableKeys} from '../../../dist/Constants';

describe('Thundra Tracer', () => {

    it('Should read listener config from environment variable with multiple filters and listener', () => {
        // Arrange
        const tracer = new ThundraTracer({});

        const listenerConfig = {
            type: "FilteringSpanListener",
            config: {
                listener: {
                    type: "LatencyInjectorSpanListener",
                    config: {
                        delay: 370,
                        injectOnFinish: true,
                        randomizeDelay: true
                    }
                },
                filters: [
                    {
                        className: "AWS-SQS",
                        domainName: "Messaging",
                        tags: {
                            "foo": "bar"
                        }
                    },
                    {
                        className: "HTTP",
                        operationName: "http_request",
                        tags: {
                            "http.host": "foobar.com",
                        }
                    }
                ]
            }
        };

        process.env[envVariableKeys.THUNDRA_AGENT_LAMBDA_SPAN_LISTENER_DEF] = JSON.stringify(listenerConfig);

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

        process.env[envVariableKeys.THUNDRA_AGENT_LAMBDA_SPAN_LISTENER_DEF] = null;
        tracer.destroy();
    });

    it('Should read listener config from environment variable with multiple filters and listener', () => {

        // Arrange
        const tracer = new ThundraTracer({});

        const listenerConfig = {
            type: "FilteringSpanListener",
            config: {
                listener: {
                    type: "ErrorInjectorSpanListener",
                    config: {
                        errorType: "NameError",
                        errorMessage: "foo",
                        injectOnFinish: true,
                        injectCountFreq: 3
                    }
                },
                filters: [
                    {
                        className: "AWS-SQS",
                        domainName: "Messaging",
                        tags: {
                            "foo": "bar"
                        }
                    }
                ]
            }
        };

        process.env[envVariableKeys.THUNDRA_AGENT_LAMBDA_SPAN_LISTENER_DEF] = JSON.stringify(listenerConfig);

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
        

        process.env[envVariableKeys.THUNDRA_AGENT_LAMBDA_SPAN_LISTENER_DEF] = null;
        tracer.destroy();
    });

    it('Should not add invalid listener', () => {

        // Arrange
        const tracer = new ThundraTracer({});

        process.env[envVariableKeys.THUNDRA_AGENT_LAMBDA_SPAN_LISTENER_DEF] = 'InvalidSpanListener[]';

        //Act
        const listeners = Utils.registerSpanListenersFromConfigurations(tracer);
        
        //Assert
        expect(listeners.length).toBe(0);
       
        process.env[envVariableKeys.THUNDRA_AGENT_LAMBDA_SPAN_LISTENER_DEF] = null;
        tracer.destroy();
    });
});   
