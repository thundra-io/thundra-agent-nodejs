import ThundraRecorder from '../../dist/opentracing/Recorder';
import SpanTreeNode from '../../dist/opentracing/SpanTree';
import ThundraSpan from '../../dist/opentracing/Span';

describe('Recorder', () => {
    describe('constructor', () => {
        const recorder = new ThundraRecorder(); 
        it('should not init root of the span tree and active span', () => {
            expect(recorder.activeSpan).toBe(undefined);
            expect(recorder.spanTree).toBe(undefined);
        });
    });

    describe('acitve span and span tree methods', () => {
        const recorder = new ThundraRecorder(); 
        const node = new SpanTreeNode();
        recorder.activeSpan = node;
        recorder.spanTree = node;
        it('should return active span and span tree root', () => {
            expect(recorder.getActiveSpan()).toBe(node);
            expect(recorder.getSpanTree()).toBe(node);
        });
    });

    describe('record with span start span event', () => {
        const recorder = new ThundraRecorder(); 
        const span = new ThundraSpan();
        recorder.record(span, 0);
        recorder.record(span, 0);
        it('should record span in memory', () => {
            expect(recorder.activeSpan.value).toBe(span);
            expect(recorder.spanTree.value).toBe(span);
        });
    });

    describe('record with span finish span event', () => {
        const recorder = new ThundraRecorder(); 
        const span = new ThundraSpan();
        recorder.record(span, 0);
        recorder.record(span, 1);
        it('should record span in memory', () => {
            expect(recorder.activeSpan).toBe(undefined);
            expect(recorder.spanTree.value).toBe(span);
        });
    });


    describe('destroy method', () => {
        const recorder = new ThundraRecorder(); 
        const node = new SpanTreeNode();
        recorder.activeSpan = node;
        recorder.spanTree = node;
        recorder.destroy();
        it('should destroy', () => {
            expect(recorder.activeSpan).toBe(null);
            expect(recorder.spanTree).toBe(null);
        });
    });
});