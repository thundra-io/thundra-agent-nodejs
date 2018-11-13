const AWSXRay =  require('aws-xray-sdk-core');
AWSXRay.getSegment = jest.fn(() => {
    return {
        addSubsegment: jest.fn()
    };
});

import AwsXRayThundraSpanListener from '../../dist/plugins/listeners/AwsXRayThundraSpanListener';
import ThundraSpan from '../../dist/opentracing/Span';
import {createMockPluginContext} from '../mocks/mocks';
const pluginContext = createMockPluginContext();

describe('AWS XRay Span Listener', () => {
    const spanListener = new AwsXRayThundraSpanListener(pluginContext);
    const span = new ThundraSpan();
    span.operationName = 'test';
    span.spanContext = {
        spanId: 'spanId'
    };    

    spanListener.normalizeOperationName = jest.fn(() => 'test');
    spanListener.onSpanStarted(span);

    it('should add subsegment on span started', () => {
        expect(spanListener.normalizeOperationName).toBeCalledWith('test');
        expect(span.getTag('THUNDRA::XRAY_SUBSEGMENTED')).toBeTruthy();
        expect(spanListener.subsegmentMap.get('spanId')).toBeTruthy();
    });
});

describe('AWS XRay Span Listener', () => {
    const spanListener = new AwsXRayThundraSpanListener(pluginContext);
    const span = new ThundraSpan();
    span.operationName = 'test';
    span.spanContext = {
        spanId: 'spanId'
    };   

    span.setTag('THUNDRA::XRAY_SUBSEGMENTED', true); 

    spanListener.normalizeOperationName = jest.fn(() => 'test');
    spanListener.addToAnnotations = jest.fn();
    spanListener.addToErrors = jest.fn();
    spanListener.addToMetadatas = jest.fn();

    const subsegmentClose = jest.fn();
    spanListener.subsegmentMap.set('spanId', {
        close: subsegmentClose
    });

    spanListener.onSpanFinished(span);
    
    it('should close subsegment on span finished', () => {
        expect(subsegmentClose).toBeCalled();
        expect(spanListener.addToAnnotations).toBeCalled();
        expect(spanListener.addToErrors).toBeCalled();
        expect(spanListener.addToMetadatas).toBeCalled();
    });
});