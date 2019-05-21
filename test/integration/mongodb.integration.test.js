import MongoDBIntegration from '../../dist/plugins/integrations/MongoDBIntegration';
import InvocationSupport from '../../dist/plugins/support/InvocationSupport';
import MongoDB from './utils/mongodb.integration.utils';
import ThundraTracer from '../../dist/opentracing/Tracer';

describe('MongoDB Integration', () => {
    InvocationSupport.setFunctionName('functionName');

    test('should instrument MongoDB insert calls', () => {
        const integration = new MongoDBIntegration({});
        const sdk = require('mongodb');

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
        const integration = new MongoDBIntegration({});
        const sdk = require('mongodb');

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
})
