import AwsXRay from '../../dist/plugins/AwsXRay';
import ThundraTracer from '../../dist/opentracing/Tracer';
import {createMockPluginContext} from '../mocks/mocks';


const pluginContext = createMockPluginContext();

describe('AwsXRay', () => {

    describe('before invocation', () => {
        const options = {opt1: 'opt1', opt2: 'opt2'};
        const xray = AwsXRay(options);
        xray.setPluginContext(pluginContext);
        const tracer = new ThundraTracer();
        tracer.addSpanListener = jest.fn();

        ThundraTracer.getInstance = jest.fn(() => tracer);

        xray.beforeInvocation({});
        
        it('should clear listeners after invocation', () => {
            expect(tracer.addSpanListener).toBeCalled();
        });
    });

    describe('after invocation', () => {
        const options = {opt1: 'opt1', opt2: 'opt2'};
        const xray = AwsXRay(options);
        xray.setPluginContext(pluginContext);
        const tracer = new ThundraTracer();
        tracer.clearListeners = jest.fn();

        ThundraTracer.getInstance = jest.fn(() => tracer);

        xray.afterInvocation({});

        it('should clear listeners after invocation', () => {
            expect(tracer.clearListeners).toBeCalled();
        });
    });
    
});