import MongoDBIntegration from '../../dist/integrations/MongoDBIntegration';
import MongoDB from './utils/mongodb.integration.utils';
import ThundraTracer from '../../dist/opentracing/Tracer';
import ExecutionContextManager from '../../dist/context/ExecutionContextManager';
import ExecutionContext from '../../dist/context/ExecutionContext';

describe('MongoDB integration', () => {
    let tracer;
    let integration;

    beforeAll(() => {
        tracer = new ThundraTracer();
        ExecutionContextManager.set(new ExecutionContext({ tracer }));
        integration = new MongoDBIntegration();
    });

    afterEach(() => {
        tracer.destroy();
    });
    
    test('should instrument MongoDB insert calls', () => {
        const sdk = require('mongodb');
        const doc = {
            name: 'foo',
            colors: ['gray', 'black', 'white'],
        };

        return MongoDB.insert(doc, sdk).then(() => {
            const span = tracer.getRecorder().spanList[0];
            
            expect(span.className).toBe('MONGODB');
            expect(span.domainName).toBe('DB');
            expect(span.operationName).toBe('testDB');
            expect(span.tags['operation.type']).toBe('WRITE');

            const hostCheck = (span.tags['db.host'] === 'localhost' || span.tags['db.host'] === '127.0.0.1');
            expect(hostCheck).toBeTruthy();

            expect(span.tags['db.port']).toBe('27017');
            expect(span.tags['db.instance']).toBe('testDB');
            expect(span.tags['db.type']).toBe('mongodb');
            
            expect(span.tags['mongodb.command.name']).toBe('INSERT');
            expect(span.tags['mongodb.collection.name']).toBe('testCollection');

            expect(span.tags['topology.vertex']).toEqual(true);

            let command = JSON.parse(span.tags['mongodb.command']);
            expect(command.documents[0].name).toBe('foo');
        });
    });
    
    test('should instrument MongoDB update calls', () => {
        const sdk = require('mongodb');
        const doc = {
            name: 'foo',
            colors: ['gray', 'black', 'white'],
        };

        return MongoDB.update(doc, {name: 'foo'}, sdk).then(() => {
            const span = tracer.getRecorder().spanList[1];
            expect(span.className).toBe('MONGODB');
            expect(span.domainName).toBe('DB');
            expect(span.operationName).toBe('testDB');
            expect(span.tags['operation.type']).toBe('WRITE');
            
            const hostCheck = (span.tags['db.host'] === 'localhost' || span.tags['db.host'] === '127.0.0.1');
            expect(hostCheck).toBeTruthy();

            expect(span.tags['db.port']).toBe('27017');
            expect(span.tags['db.instance']).toBe('testDB');
            expect(span.tags['db.type']).toBe('mongodb');
            
            expect(span.tags['mongodb.command.name']).toBe('UPDATE');
            expect(span.tags['mongodb.collection.name']).toBe('testCollection');

            expect(span.tags['topology.vertex']).toEqual(true);

            let command = JSON.parse(span.tags['mongodb.command']);
            expect(command.updates[0].q.name).toBe('foo');
        });
    });
    
    test('should instrument a failing MongoDB call', () => {
        const sdk = require('mongodb');
        const doc = {
            name: 'foo',
            colors: ['gray', 'black', 'white'],
        };

        return MongoDB.dropCollection(sdk).then(() => {
            const span = tracer.getRecorder().spanList[0];
            expect(span.className).toBe('MONGODB');
            expect(span.domainName).toBe('DB');
            expect(span.operationName).toBe('testDB');
            expect(span.tags['operation.type']).toBe('DELETE');
            expect(span.tags['db.host']).toBe('localhost');
            expect(span.tags['db.port']).toBe('27017');
            expect(span.tags['db.instance']).toBe('testDB');
            expect(span.tags['db.type']).toBe('mongodb');
            
            expect(span.tags['mongodb.command.name']).toBe('DROP');
            expect(span.tags['mongodb.collection.name']).toBe('non_exist');

            expect(span.tags['topology.vertex']).toEqual(true);

            expect(span.tags['error']).toBe(true);
        });
    });
});
