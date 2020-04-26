import ESIntegrations from '../../dist/plugins/integrations/ESIntegration';
import InvocationSupport from '../../dist/plugins/support/InvocationSupport';
import ThundraTracer from '../../dist/opentracing/Tracer';
import ES from './utils/es.integration.utils';

describe('ES integration', () => {
    test('should instrument ES calls with single host', () => {
        const tracer = new ThundraTracer();
        const integration = new ESIntegrations({
            tracer,
            esPathDepth: 2,
        });
        const sdk = require('elasticsearch');

        InvocationSupport.setFunctionName('functionName');

        return ES.query(sdk).then((data) => {
            const span = tracer.getRecorder().spanList[0];
            expect(span.operationName).toBe('/twitter/tweets');
            expect(span.className).toBe('ELASTICSEARCH');
            expect(span.domainName).toBe('DB');

            expect(span.tags['operation.type']).toBe('POST');
            expect(span.tags['db.host']).toBe('localhost');
            expect(span.tags['db.port']).toBe(9200);
            expect(span.tags['db.type']).toBe('elasticsearch');
            expect(span.tags['db.statement']).toBe('{"query":{"match":{"body":"elasticsearch"}}}');

            expect(span.tags['topology.vertex']).toEqual(true);
            expect(span.tags['trigger.domainName']).toEqual('API');
            expect(span.tags['trigger.className']).toEqual('AWS-Lambda');
            expect(span.tags['trigger.operationNames']).toEqual(['functionName']);

            expect(span.tags['elasticsearch.uri']).toEqual('/twitter/tweets/_search');
            expect(span.tags['elasticsearch.normalized_uri']).toEqual('/twitter/tweets');
            expect(span.tags['elasticsearch.method']).toEqual('POST');
            expect(span.tags['elasticsearch.params']).toEqual('{}');
            expect(span.tags['elasticsearch.body']).toEqual('{"query":{"match":{"body":"elasticsearch"}}}');
        });
    });

    test('should instrument ES calls with single host', () => {
        const tracer = new ThundraTracer();
        const integration = new ESIntegrations({
            tracer,
            esPathDepth: 1
        });
        const sdk = require('elasticsearch');

        InvocationSupport.setFunctionName('functionName');
        const hostList = ['localhost', 'test.elastic.io'];
        const portList = [9200, 9201];

        return ES.queryWithMultipleHost(sdk).then((data) => {
            const span = tracer.getRecorder().spanList[0];
            expect(span.operationName).toBe('/twitter');
            expect(span.className).toBe('ELASTICSEARCH');
            expect(span.domainName).toBe('DB');

            expect(span.tags['operation.type']).toBe('POST');
            expect(hostList).toContain(span.tags['db.host']);
            expect(portList).toContain(span.tags['db.port']);
            expect(span.tags['db.type']).toBe('elasticsearch');
            expect(span.tags['db.statement']).toBe('{"query":{"match":{"body":"elasticsearch"}}}');

            expect(span.tags['topology.vertex']).toEqual(true);
            expect(span.tags['trigger.domainName']).toEqual('API');
            expect(span.tags['trigger.className']).toEqual('AWS-Lambda');
            expect(span.tags['trigger.operationNames']).toEqual(['functionName']);

            expect(span.tags['elasticsearch.uri']).toEqual('/twitter/tweets/_search');
            expect(span.tags['elasticsearch.normalized_uri']).toEqual('/twitter');
            expect(span.tags['elasticsearch.method']).toEqual('POST');
            expect(span.tags['elasticsearch.params']).toEqual('{}');
            expect(span.tags['elasticsearch.body']).toEqual('{"query":{"match":{"body":"elasticsearch"}}}');
        });
    });

    test('should mask ES body', () => {
        const tracer = new ThundraTracer();
        const integration = new ESIntegrations({
            disableInstrumentation: true,
            maskElasticSearchBody: true,
            esPathDepth: 2,
            tracer,
        });
        const sdk = require('elasticsearch');

        InvocationSupport.setFunctionName('functionName');

        return ES.query(sdk).then((data) => {
            const span = tracer.getRecorder().spanList[0];

            expect(span.tags['elasticsearch.params']).not.toBeTruthy();
            expect(span.tags['elasticsearch.body']).not.toBeTruthy();
            expect(span.tags['db.statement']).not.toBeTruthy();

            expect(span.operationName).toBe('/twitter/tweets');
            expect(span.className).toBe('ELASTICSEARCH');
            expect(span.domainName).toBe('DB');
            expect(span.tags['operation.type']).toBe('POST');
            expect(span.tags['db.host']).toBe('localhost');
            expect(span.tags['db.port']).toBe(9200);
            expect(span.tags['db.type']).toBe('elasticsearch');
            expect(span.tags['topology.vertex']).toEqual(true);
            expect(span.tags['trigger.domainName']).toEqual('API');
            expect(span.tags['trigger.className']).toEqual('AWS-Lambda');
            expect(span.tags['trigger.operationNames']).toEqual(['functionName']);
            expect(span.tags['elasticsearch.uri']).toEqual('/twitter/tweets/_search');
            expect(span.tags['elasticsearch.normalized_uri']).toEqual('/twitter/tweets');
            expect(span.tags['elasticsearch.method']).toEqual('POST');
        });
    });
});
