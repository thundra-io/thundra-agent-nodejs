import AwsXRay from '../../dist/plugins/AwsXRay';
import ThundraTracer from '../../dist/opentracing/Tracer';
import {createMockPluginContext} from '../mocks/mocks';


const pluginContext = createMockPluginContext();

describe('AwsXRay', () => {

    describe('constructor', () => {
        const tracer = new ThundraTracer();
        tracer.addSpanListener = jest.fn();

        const xray = AwsXRay({
            tracer,
        });
        xray.setPluginContext(pluginContext);
        ThundraTracer.getInstance = jest.fn(() => tracer);
        
        it('should add listeners in plugin initialization', () => {
            expect(tracer.addSpanListener).toBeCalled();
        });
    });   
});