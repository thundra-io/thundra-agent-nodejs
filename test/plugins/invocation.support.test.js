import InvocationSupport from '../../dist/plugins/support/InvocationSupport';

describe('invocation support', () => {
    beforeEach(() => {
        InvocationSupport.removeTags();
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
            
            expect(InvocationSupport.userTags['number']).toBe(5);
            expect(InvocationSupport.userTags['string']).toBe('value');
            expect(InvocationSupport.userTags['boolean']).toBe(true);
            expect(InvocationSupport.tags['number']).toBe(7);
            expect(InvocationSupport.tags['string']).toBe('foo');
            expect(InvocationSupport.tags['boolean']).toBe(false);
            expect(InvocationSupport.userTags ['object']).toBe(object);
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
                name: 'ibrahim',
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

            expect(InvocationSupport.tags).toEqual({});
            expect(InvocationSupport.userTags).toEqual({});
        });
    });

    describe('should set exception', () => {
        test('error', () => {
            InvocationSupport.setError(Error('custom error'));
            expect(InvocationSupport.error.errorType).toBe('Error');
            expect(InvocationSupport.error.errorMessage).toBe('custom error');
            expect(InvocationSupport.error.code).toBe(0);
            expect(InvocationSupport.error.stack).not.toBe(undefined);
        });
    });

    describe('should clear exception', () => {
        test('error', () => {
            InvocationSupport.setError(Error('custom error'));
            InvocationSupport.clearError();
            expect(InvocationSupport.error).toBe(undefined);
        });
    });

    describe('should has exception', () => {
        test('error', () => {
            InvocationSupport.setError(Error('custom error'));
            expect(InvocationSupport.hasError()).toBe(true);
            InvocationSupport.clearError();
            expect(InvocationSupport.hasError()).toBe(false);
        });
    });
});