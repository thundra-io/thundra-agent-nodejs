import ESIntegrations from '../../dist/plugins/integrations/ESIntegration';
import InvocationSupport from '../../dist/plugins/support/InvocationSupport';
import ThundraTracer from '../../dist/opentracing/Tracer';
import ES from './utils/es.integration.utils';

describe('Elastic Search Integration', () => {
    test('should instrument ES calls ', () => {
        const integration = new ESIntegrations({});
        const sdk = require('elasticsearch');
        integration.wrap(sdk.Transport, {});

        const tracer = new ThundraTracer();
        InvocationSupport.setFunctionName('functionName');

        return ES.query(sdk).then((data) => {
            const span = tracer.getRecorder().spanList[0];
            expect(span.operationName).toBe('localhost');
            expect(span.className).toBe('ELASTICSEARCH');
            expect(span.domainName).toBe('DB');

            expect(span.tags['operation.type']).toBe('READ');
            expect(span.tags['db.instance']).toBe('localhost');
            expect(span.tags['db.host']).toBe('localhost');
            expect(span.tags['db.port']).toBe('9200');
            expect(span.tags['db.type']).toBe('elasticsearch');

            expect(span.tags['topology.vertex']).toEqual(true);
            expect(span.tags['trigger.domainName']).toEqual('API');
            expect(span.tags['trigger.className']).toEqual('AWS-Lambda');
            expect(span.tags['trigger.operationNames']).toEqual(['functionName']);

            expect(span.tags['elasticsearch.url']).toEqual('/twitter/tweets/_search');
            expect(span.tags['elasticsearch.method']).toEqual('POST');
            expect(span.tags['elasticsearch.params']).toEqual('{}');
            expect(span.tags['elasticsearch.body']).toEqual('{"query":{"match":{"body":"elasticsearch"}}}');
        });
    });
});
