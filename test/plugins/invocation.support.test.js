import InvocationSupport from '../../dist/plugins/support/InvocationSupport';
import ExecutionContext from '../../dist/context/ExecutionContext';
import ExecutionContextManager from '../../dist/context/ExecutionContextManager';

describe('invocation support', () => {
    beforeEach(() => {
        ExecutionContextManager.set(new ExecutionContext());
    });

    describe('should set tag', () => {          
        test('tags', () => {
            InvocationSupport.setTag('number', 5);
            InvocationSupport.setTag('string', 'value');
            InvocationSupport.setTag('boolean', true);

            InvocationSupport.setAgentTag('number', 7);
            InvocationSupport.setAgentTag('string', 'foo');
            InvocationSupport.setAgentTag('boolean', false);
            const object = {
                name: 'ibrahim',
                age: 15,
            };
    
            InvocationSupport.setTag('object', object);
            
            expect(InvocationSupport.getTag('number')).toBe(5);
            expect(InvocationSupport.getTag('string')).toBe('value');
            expect(InvocationSupport.getTag('boolean')).toBe(true);
            expect(InvocationSupport.getAgentTag('number')).toBe(7);
            expect(InvocationSupport.getAgentTag('string')).toBe('foo');
            expect(InvocationSupport.getAgentTag('boolean')).toBe(false);
            expect(InvocationSupport.getTag('object')).toBe(object);
        });
    });


    describe('should get tag', () => {
        test('tags', () => {
            InvocationSupport.setTag('string', 'value');
            InvocationSupport.setTag('boolean', true);
            InvocationSupport.setTag('number', 5);
            
            InvocationSupport.setAgentTag('string', 'foo');
            InvocationSupport.setAgentTag('boolean', false);
            InvocationSupport.setAgentTag('number', 7);

            const object = {
                name: 'foo',
                age: 15,
            };
            InvocationSupport.setTag('object', object);

            expect(InvocationSupport.getTag('number')).toBe(5);
            expect(InvocationSupport.getTag('string')).toBe('value');
            expect(InvocationSupport.getTag('boolean')).toBe(true);
            expect(InvocationSupport.getTag('object')).toBe(object);

            expect(InvocationSupport.getAgentTag('number')).toBe(7);
            expect(InvocationSupport.getAgentTag('string')).toBe('foo');
            expect(InvocationSupport.getAgentTag('boolean')).toBe(false);
        });
    });

    describe('should remove tags', () => {      
        test('tags', () => {
            InvocationSupport.setTag('number', 5);
            InvocationSupport.setTag('string', 'value');

            InvocationSupport.setAgentTag('number', 7);
            InvocationSupport.setAgentTag('string', 'foo');

            InvocationSupport.removeTags();
            InvocationSupport.removeAgentTags();

            expect(InvocationSupport.getAgentTags()).toEqual({});
            expect(InvocationSupport.getTags()).toEqual({});
        });
    });

    describe('should set exception', () => {
        test('error', () => {
            const err = new Error('custom error');
            InvocationSupport.setError(err);
            expect(InvocationSupport.getError()).toBe(err);
        });
    });

    describe('should clear exception', () => {
        test('error', () => {
            InvocationSupport.setError(new Error('custom error'));
            InvocationSupport.clearError();
            expect(InvocationSupport.getError()).toBe(null);
        });
    });

    describe('should has exception', () => {
        test('error', () => {
            InvocationSupport.setError(new Error('custom error'));
            expect(InvocationSupport.hasError()).toBe(true);
            InvocationSupport.clearError();
            expect(InvocationSupport.hasError()).toBe(false);
        });
    });
});