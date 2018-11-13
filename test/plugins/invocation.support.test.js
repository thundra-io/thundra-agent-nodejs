import InvocationSupport from '../../dist/plugins/support/InvocationSupport';

describe('Invocation Support', () => {

    beforeEach(() => {
        InvocationSupport.instance = null;
    });

    describe('should return singleton', () => {
        new InvocationSupport();
        
        test('getInstance called', () => {
            expect(InvocationSupport.getInstance()).toBeTruthy();
        });  
    });


    describe('should set tag', () => {          
        const invocationSupport = new InvocationSupport();

        invocationSupport.setTag('number', 5);
        invocationSupport.setTag('string', 'value');
        invocationSupport.setTag('boolean', true);
        const object = {
            name: 'ibrahim',
            age: 15,
        };

        invocationSupport.setTag('object', object);

        test('tags', () => {
            expect(invocationSupport.tags.get('number')).toBe(5);
            expect(invocationSupport.tags.get('string')).toBe('value');
            expect(invocationSupport.tags.get('boolean')).toBe(true);
            expect(invocationSupport.tags.get('object')).toBe(object);
        });
    });


    describe('should get tag', () => {
        const invocationSupport = new InvocationSupport();

        invocationSupport.setTag('string', 'value');
        invocationSupport.setTag('boolean', true);
        invocationSupport.setTag('number', 5);
        const object = {
            name: 'ibrahim',
            age: 15,
        };
        invocationSupport.setTag('object', object);

        test('tags', () => {
            expect(invocationSupport.getTag('number')).toBe(5);
            expect(invocationSupport.getTag('string')).toBe('value');
            expect(invocationSupport.getTag('boolean')).toBe(true);
            expect(invocationSupport.getTag('object')).toBe(object);
        });
    });

    describe('should remove tags', () => {      
        const invocationSupport = new InvocationSupport();

        invocationSupport.setTag('number', 5);
        invocationSupport.setTag('string', 'value');

        invocationSupport.removeTags();

        test('tags', () => {
            expect(invocationSupport.tags.size).toBe(0);
        });
    });
});