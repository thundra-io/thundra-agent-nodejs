import MongoDBIntegration from '../../dist/plugins/integrations/MongoDBIntegration';
import InvocationSupport from '../../dist/plugins/support/InvocationSupport';
import MongoDB from './utils/mongodb.integration.utils';
import ThundraTracer from '../../dist/opentracing/Tracer';

describe('MongoDB Integration', () => {
    InvocationSupport.setFunctionName('functionName');
    const sdk = require('mongodb');
    const integration = new MongoDBIntegration({});

    test('should instrument MongoDB insert calls', () => {
        const tracer = new ThundraTracer();
        const doc = {
            name: "foo",
            colors: ["gray", "black", "white"],
        };

        return MongoDB.insert(doc, sdk).then(() => {
            const span = tracer.getRecorder().spanList[0];
            
            expect(span.className).toBe('MONGODB');
            expect(span.domainName).toBe('DB');
            expect(span.operationName).toBe('INSERT');
            expect(span.tags['operation.type']).toBe('WRITE');
            expect(span.tags['db.host']).toBe('localhost');
            expect(span.tags['db.port']).toBe('27017');
            expect(span.tags['db.instance']).toBe('testDB');
            expect(span.tags['db.type']).toBe('mongodb');
            
            expect(span.tags['mongodb.command.name']).toBe('INSERT');
            expect(span.tags['mongodb.collection.name']).toBe('testCollection');

            expect(span.tags['topology.vertex']).toEqual(true);
            expect(span.tags['trigger.domainName']).toEqual('API');
            expect(span.tags['trigger.className']).toEqual('AWS-Lambda');
            expect(span.tags['trigger.operationNames']).toEqual(['functionName']);

            let command = JSON.parse(span.tags['mongodb.command'])
            expect(command.documents[0].name).toBe('foo');
        });
    });
    
    test('should instrument MongoDB update calls', () => {
        const tracer = new ThundraTracer();
        const doc = {
            name: 'foo',
            colors: ['gray', 'black', 'white'],
        };

        return MongoDB.update(doc, {name: 'foo'}, sdk).then(() => {
            const span = tracer.getRecorder().spanList[1];
            expect(span.className).toBe('MONGODB');
            expect(span.domainName).toBe('DB');
            expect(span.operationName).toBe('UPDATE');
            expect(span.tags['operation.type']).toBe('WRITE');
            expect(span.tags['db.host']).toBe('localhost');
            expect(span.tags['db.port']).toBe('27017');
            expect(span.tags['db.instance']).toBe('testDB');
            expect(span.tags['db.type']).toBe('mongodb');
            
            expect(span.tags['mongodb.command.name']).toBe('UPDATE');
            expect(span.tags['mongodb.collection.name']).toBe('testCollection');

            expect(span.tags['topology.vertex']).toEqual(true);
            expect(span.tags['trigger.domainName']).toEqual('API');
            expect(span.tags['trigger.className']).toEqual('AWS-Lambda');
            expect(span.tags['trigger.operationNames']).toEqual(['functionName']);

            let command = JSON.parse(span.tags['mongodb.command']);
            expect(command.updates[0].q.name).toBe('foo');
        });
    });
    
    test('should instrument a failing MongoDB call', () => {
        const tracer = new ThundraTracer();
        const doc = {
            name: 'foo',
            colors: ['gray', 'black', 'white'],
        };

        return MongoDB.dropCollection(sdk).then(() => {
            const span = tracer.getRecorder().spanList[0];
            expect(span.className).toBe('MONGODB');
            expect(span.domainName).toBe('DB');
            expect(span.operationName).toBe('DROP');
            expect(span.tags['operation.type']).toBe('DELETE');
            expect(span.tags['db.host']).toBe('localhost');
            expect(span.tags['db.port']).toBe('27017');
            expect(span.tags['db.instance']).toBe('testDB');
            expect(span.tags['db.type']).toBe('mongodb');
            
            expect(span.tags['mongodb.command.name']).toBe('DROP');
            expect(span.tags['mongodb.collection.name']).toBe('non_exist');

            expect(span.tags['topology.vertex']).toEqual(true);
            expect(span.tags['trigger.domainName']).toEqual('API');
            expect(span.tags['trigger.className']).toEqual('AWS-Lambda');
            expect(span.tags['trigger.operationNames']).toEqual(['functionName']);

            expect(span.tags['error']).toBe(true)
        });
    });
})
