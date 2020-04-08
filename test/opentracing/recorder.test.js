import ThundraRecorder from '../../dist/opentracing/Recorder';
import ThundraSpan from '../../dist/opentracing/Span';

describe('recorder', () => {
    describe('constructor', () => {
        const recorder = new ThundraRecorder(); 
        it('should not init active span and span order should be 1', () => {
            expect(recorder.spanList).toEqual([]);
            expect(recorder.spanOrder).toBe(1);
        });
    });

    describe('record with span start span event', () => {
        const recorder = new ThundraRecorder(); 
        const span = new ThundraSpan();
        recorder.record(span, 0);
        it('should record span in memory', () => {
            expect(recorder.getActiveSpan()).toBe(span);
            expect(recorder.spanOrder).toBe(2);
        });
    });

    describe('record with span finish span event', () => {
        const recorder = new ThundraRecorder(); 
        const span = new ThundraSpan();
        recorder.record(span, 0);
        recorder.record(span, 1);
        recorder.record(span, 2);
        it('should record span in memory', () => {
            expect(recorder.getActiveSpan()).toBe(undefined);
        });
    });

    describe('destroy method', () => {
        const recorder = new ThundraRecorder(); 
        const node = new ThundraSpan();
        recorder.record(node, 0);
        recorder.record(node, 1);
        recorder.record(node, 2);
        recorder.destroy();
        it('should destroy', () => {
            expect(recorder.spanList.length).toBe(0);
            expect(recorder.spanOrder).toBe(1);
        });
    });
});