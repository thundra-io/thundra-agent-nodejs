import ThundraTracer from '../../dist/opentracing/Tracer';
import InvocationTraceSupport from '../../dist/plugins/support/InvocationTraceSupport';
import { SpanTags } from '../../dist/Constants';
import Utils from '../utils';

describe('Invocation Trace Support', () => {

    test('Should only add topology vertex spans as resources', () => {
        const tracer = new ThundraTracer();
        tracer.recorder.destroy();

        const span1 = tracer.startSpan('resource1');
        span1.className = 'className1';
        
        const span2 = tracer.startSpan('resource2');    
        span2.className = 'className2';
        span2.setTag(SpanTags.OPERATION_TYPE, 'operationType2');
        span2.startTime = 0;
        span2.finishTime = 10;
        span2.setTag(SpanTags.TOPOLOGY_VERTEX, true);

        const span3 = tracer.startSpan('resource3');
        span3.className = 'className3';
        
        const resources = InvocationTraceSupport.getResources();

        expect(resources.length).toBe(1);
        expect(resources[0].resourceName).toBe('resource2');
        expect(resources[0].resourceType).toBe('className2');
        expect(resources[0].resourceDuration).toBe(10);
        expect(resources[0].resourceCount).toBe(1);
        expect(resources[0].resourceErrorCount).toBe(0);

    });

    test('Should merge resources if same resource id resource is created', () => {
        const tracer = new ThundraTracer();
        tracer.recorder.destroy();
           
        const spanOptions = {
            operationName: 'resource',
            className: 'className',
            operationType: 'operationType',
            duration: 10,
            vertex: true,
            error: false,
        };
        const span1 = Utils.createMockSpan(tracer, spanOptions);

        spanOptions.duration = 20;
        Utils.createMockSpan(tracer, spanOptions);

        spanOptions.duration = 30;
        Utils.createMockSpan(tracer ,spanOptions);
    
        const resources = InvocationTraceSupport.getResources();
        const resourceId = InvocationTraceSupport.generateResourceIdFromSpan(span1);
        const resource = resources.filter((resource) => resource.generateId() === resourceId)[0];


        expect(resources.length).toBe(1);
        expect(resource.resourceName).toBe('resource');
        expect(resource.resourceType).toBe('className');
        expect(resource.resourceDuration).toBe(60);
        expect(resource.resourceCount).toBe(3);
        expect(resource.resourceErrorCount).toBe(0);
        expect(resource.resourceMaxDuration).toBe(30);
        expect(resource.resourceAvgDuration).toBe(20);
    });

    test('Should merge resources errors if same resource id resource is created', () => {
        const tracer = new ThundraTracer();
        tracer.recorder.destroy();

        const spanOptions = {
            operationName: 'resource_error',
            className: 'className',
            operationType: 'operationType',
            duration: 10,
            vertex: true,
            error: true,
            errorKind: 'Database Error1',
        };

        const span1 = Utils.createMockSpan(tracer, spanOptions);

        spanOptions.errorKind = 'Database Error1';
        spanOptions.duration = 20;
        Utils.createMockSpan(tracer, spanOptions);
        
        spanOptions.errorKind = 'Database Error2';
        spanOptions.duration = 30;
        Utils.createMockSpan(tracer, spanOptions);

        const resources = InvocationTraceSupport.getResources();
        const resourceId = InvocationTraceSupport.generateResourceIdFromSpan(span1);
        const resource = resources.filter((resource) => resource.generateId() === resourceId)[0];

        expect(resources.length).toBe(1);
        expect(resource.resourceName).toBe('resource_error');
        expect(resource.resourceType).toBe('className');
        expect(resource.resourceDuration).toBe(60);
        expect(resource.resourceCount).toBe(3);
        expect(resource.resourceErrorCount).toBe(3);
        
        expect(resource.resourceErrors).toEqual(['Database Error1', 'Database Error2']);
    });

    test('Should set resourceMaxDuration while merging resources', () => {
        const tracer = new ThundraTracer();
        tracer.recorder.destroy();

        const spanOptions = {
            operationName: 'resource',
            className: 'className',
            operationType: 'operationType',
            duration: 35,
            vertex: true,
            error: false,
        };
        const span1 = Utils.createMockSpan(tracer, spanOptions);

        spanOptions.duration = 10;
        Utils.createMockSpan(tracer, spanOptions);

        spanOptions.duration = 30;
        Utils.createMockSpan(tracer ,spanOptions);

        const resources = InvocationTraceSupport.getResources();
        const resourceId = InvocationTraceSupport.generateResourceIdFromSpan(span1);
        const resource = resources.filter((resource) => resource.generateId() === resourceId)[0];

        expect(resources.length).toBe(1);
        expect(resource.resourceName).toBe('resource');
        expect(resource.resourceType).toBe('className');
        expect(resource.resourceDuration).toBe(75);
        expect(resource.resourceCount).toBe(3);
        expect(resource.resourceErrorCount).toBe(0);
        expect(resource.resourceMaxDuration).toBe(35);
        expect(resource.resourceAvgDuration).toBe(25);

    });

    test('Should set resourceAvgDuration while merging resources', () => {
        const tracer = new ThundraTracer();
        tracer.recorder.destroy();

        const spanOptions = {
            operationName: 'resource',
            className: 'className',
            operationType: 'operationType',
            duration: 25,
            vertex: true,
            error: false,
        };
        const span1 = Utils.createMockSpan(tracer, spanOptions);

        spanOptions.duration = 10;
        Utils.createMockSpan(tracer, spanOptions);

        spanOptions.duration = 30;
        Utils.createMockSpan(tracer ,spanOptions);

        const resources = InvocationTraceSupport.getResources();
        const resourceId = InvocationTraceSupport.generateResourceIdFromSpan(span1);
        const resource = resources.filter((resource) => resource.generateId() === resourceId)[0];

        expect(resources.length).toBe(1);
        expect(resource.resourceName).toBe('resource');
        expect(resource.resourceType).toBe('className');
        expect(resource.resourceDuration).toBe(65);
        expect(resource.resourceCount).toBe(3);
        expect(resource.resourceErrorCount).toBe(0);
        expect(resource.resourceMaxDuration).toBe(30);
        expect(resource.resourceAvgDuration).toBe(21.67);

    });
});
