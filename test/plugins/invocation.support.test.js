import InvocationSupport from '../../dist/plugins/support/InvocationSupport';

describe('Invocation Support', () => {

    beforeEach(() => {
        InvocationSupport.removeTags();
    });

    describe('should set tag', () => {          
        test('tags', () => {
            InvocationSupport.setTag('number', 5);
            InvocationSupport.setTag('string', 'value');
            InvocationSupport.setTag('boolean', true);
            const object = {
                name: 'ibrahim',
                age: 15,
            };
    
            InvocationSupport.setTag('object', object);
            
            expect(InvocationSupport.tags['number']).toBe(5);
            expect(InvocationSupport.tags['string']).toBe('value');
            expect(InvocationSupport.tags['boolean']).toBe(true);
            expect(InvocationSupport.tags['object']).toBe(object);
        });
    });


    describe('should get tag', () => {
        test('tags', () => {
            InvocationSupport.setTag('string', 'value');
            InvocationSupport.setTag('boolean', true);
            InvocationSupport.setTag('number', 5);
            const object = {
                name: 'ibrahim',
                age: 15,
            };
            InvocationSupport.setTag('object', object);

            expect(InvocationSupport.getTag('number')).toBe(5);
            expect(InvocationSupport.getTag('string')).toBe('value');
            expect(InvocationSupport.getTag('boolean')).toBe(true);
            expect(InvocationSupport.getTag('object')).toBe(object);
        });
    });

    describe('should remove tags', () => {      
        test('tags', () => {
            InvocationSupport.setTag('number', 5);
            InvocationSupport.setTag('string', 'value');

            InvocationSupport.removeTags();
            expect(InvocationSupport.tags).toEqual({});
        });
    });
});