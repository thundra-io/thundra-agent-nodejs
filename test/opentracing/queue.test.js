import Queue from '../../dist/opentracing/Queue';

describe('Queue', () => {
    describe('constructor', () => {
        const queue = new Queue(); 
        it('should create a store with empty size', () => {
            expect(queue.store.length).toBe(0);
        });
    });

    describe('should have push and pop methods', () => {
        const queue = new Queue(); 
        queue.push(5);
        queue.push(6);
        const value = queue.pop();
        it('should pop first pushed value', () => {
            expect(value).toBe(5);
        });
    });
});
