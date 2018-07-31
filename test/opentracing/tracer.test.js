import ThundraTracer from '../../dist/opentracing/Tracer';
import {Reference} from 'opentracing';
import { Trace } from '../../dist/plugins/trace';

describe('Recorder', () => {
    describe('constructor', () => {
        const tracer = new ThundraTracer({}); 
        it('should not init recorder sampler and active spans', () => {
            expect(tracer.recorder).toBeTruthy();
            expect(tracer.sampler).toBeTruthy();
        });
    });

    describe('startSpan', () => {
        const tracer = new ThundraTracer({}); 
        const span1 = tracer.startSpan('operation-name-1');
        const span2 = tracer.startSpan('operation-name-2');
        it('should start span with given operation name', () => {
            expect(span1.getOperationName()).toBe('operation-name-1');
            expect(span2.getOperationName()).toBe('operation-name-2');
        });
    });

    describe('getActiveSpan', () => {
        const tracer = new ThundraTracer({}); 
        it('should return null when no active span', () => {
            expect(tracer.getActiveSpan()).toBe(null);
        });
    });

    describe('span.finish', () => {
        const tracer = new ThundraTracer({}); 
        const span = tracer.startSpan('operation-name-1');
        span.finish();
        it('should record span value to span tree', () => {
            expect(tracer.recorder.spanTree.value).toBe(span);
        });
    });

    describe('tracer finishSpan()', () => {
        const tracer = new ThundraTracer({}); 
        const span = tracer.startSpan('operation-name-1');
        tracer.finishSpan();
        it('should record span value to span tree', () => {
            expect(tracer.recorder.spanTree.value).toBe(span);
        });
    });

    describe('inject and extract', () => {
        const tracer = new ThundraTracer({}); 
        it('should throw exception with unsupported methods', () => {
            expect(() => {tracer.inject();}).toThrow(new Error('Thundra Tracer does not support inject.'));
            expect(() => {tracer.extract();}).toThrow(new Error('Thundra Tracer does not support extract.'));
        });
    });

    describe('Span parent child relation with child of reference', () => {
        const tracer = new ThundraTracer({}); 

        const parentSpan = tracer.startSpan('parent');
        parentSpan.setTag('tag-key', 'tagValue');
        parentSpan.log({'test-log': 'logValue'});

        const childSpan = tracer.startSpan('child', { childOf: parentSpan });

        childSpan.finish();
        parentSpan.finish();

        it('should set log and tag relations', () => {
            expect(tracer.recorder.spanTree.value.getOperationName()).toEqual('parent');
            expect(tracer.recorder.spanTree.value.getTag('tag-key')).toEqual('tagValue');
            expect(tracer.recorder.spanTree.value.logs[0].timestamp).not.toBeNull();
            expect(tracer.recorder.spanTree.children.length).toEqual(1);
            expect(tracer.recorder.spanTree.children[0].value.getOperationName()).toEqual('child');
        });
    
    });

    describe('Span parent child relation with follows from reference', () => {
        const tracer = new ThundraTracer({}); 

        const parentSpan = tracer.startSpan('parent');
        const childSpan = tracer.startSpan('child', {
            references:[new Reference('follows_from', parentSpan.context())]
        });

        childSpan.finish();
        parentSpan.finish();

        it('should set log and tag relations', () => {
            expect(tracer.recorder.spanTree.value.getOperationName()).toEqual('parent');
            expect(tracer.recorder.spanTree.children.length).toEqual(1);
            expect(tracer.recorder.spanTree.children[0].value.getOperationName()).toEqual('child');
        });
    
    });

    describe('Tracer wrapper function', () => {
        const tracer = new ThundraTracer({}); 

        const userFunction = () => {};
        const wrappedFunction = tracer.wrapper('userFunction', userFunction);
        
        wrappedFunction();

        it('should wrap users code with start and finish span', () => {
            expect(tracer.recorder.spanTree.value.getOperationName()).toEqual('userFunction');
            expect(tracer.recorder.spanTree.children.length).toEqual(0);
        });
    
    });

    describe('Span tree with more than dept 2', () => {
        const tracer = new ThundraTracer({}); 

        tracer.startSpan('f1');
        tracer.startSpan('f2');
        tracer.startSpan('f3');
        tracer.finishSpan();
        tracer.finishSpan();
        tracer.finishSpan();

        const tracePlugin = new Trace({});
        const recorder = tracer.getRecorder();
        const spanTree = recorder.getSpanTree();
        const rootAuditInfos = tracePlugin.generateAuditInfoFromTraces(spanTree);

        it('should have dept 2', () => {
            expect(rootAuditInfos[0].children.length).toEqual(1);
            expect(tracer.recorder.spanTree.value.getOperationName()).toEqual('f1');
            expect(tracer.recorder.spanTree.children[0].value.getOperationName()).toEqual('f2');
            expect(tracer.recorder.spanTree.children[0].children[0].value.getOperationName()).toEqual('f3');
            expect(tracer.recorder.spanTree.children.length).toEqual(1);
            expect(tracer.recorder.spanTree.children[0].children.length).toEqual(1);
        });
    
    });
});