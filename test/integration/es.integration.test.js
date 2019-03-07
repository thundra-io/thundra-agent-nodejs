import ESIntegrations from '../../dist/plugins/integrations/ESIntegration';
import InvocationSupport from '../../dist/plugins/support/InvocationSupport';
import ThundraTracer from '../../dist/opentracing/Tracer';
import ES from './utils/es.integration.utils';
import TraceConfig from '../../dist/plugins/config/TraceConfig';

describe('Elastic Search Integration', () => {
    test('should instrument ES calls with single host', () => {
        const integration = new ESIntegrations({});
        const sdk = require('elasticsearch');
        integration.wrap(sdk.Transport, {});

        const tracer = new ThundraTracer();
        InvocationSupport.setFunctionName('functionName');

        return ES.query(sdk).then((data) => {
            const span = tracer.getRecorder().spanList[0];
            expect(span.operationName).toBe('/twitter/tweets/_search');
            expect(span.className).toBe('ELASTICSEARCH');
            expect(span.domainName).toBe('DB');

            expect(span.tags['operation.type']).toBe('READ');
            expect(span.tags['db.host']).toBe('localhost');
            expect(span.tags['db.port']).toBe(9200);
            expect(span.tags['db.type']).toBe('elasticsearch');
            expect(span.tags['db.statement']).toBe('{"query":{"match":{"body":"elasticsearch"}}}');

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

    test('should instrument ES calls with single host', () => {
        const integration = new ESIntegrations({});
        const sdk = require('elasticsearch');
        integration.wrap(sdk.Transport, {});

        const tracer = new ThundraTracer();
        InvocationSupport.setFunctionName('functionName');
        const hostList = ['localhost', 'test.elastic.io'];
        const portList = [9200, 9201];

        return ES.queryWithMultipleHost(sdk).then((data) => {
            const span = tracer.getRecorder().spanList[0];
            expect(span.operationName).toBe('/twitter/tweets/_search');
            expect(span.className).toBe('ELASTICSEARCH');
            expect(span.domainName).toBe('DB');

            expect(span.tags['operation.type']).toBe('READ');
            expect(hostList).toContain(span.tags['db.host']);
            expect(portList).toContain(span.tags['db.port']);
            expect(span.tags['db.type']).toBe('elasticsearch');
            expect(span.tags['db.statement']).toBe('{"query":{"match":{"body":"elasticsearch"}}}');

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

    test('should mask ES statments', () => {
        const integration = new ESIntegrations({});
        const sdk = require('elasticsearch');

        const traceConfig = new TraceConfig({
            disableInstrumentation: true,
            maskElasticSearchStatement: true
        });

        integration.wrap(sdk.Transport, traceConfig);

        const tracer = new ThundraTracer();
        InvocationSupport.setFunctionName('functionName');

        return ES.query(sdk).then((data) => {
            const span = tracer.getRecorder().spanList[0];

            expect(span.tags['elasticsearch.params']).not.toBeTruthy();
            expect(span.tags['elasticsearch.body']).not.toBeTruthy();
            expect(span.tags['db.statement']).not.toBeTruthy();

            expect(span.operationName).toBe('/twitter/tweets/_search');
            expect(span.className).toBe('ELASTICSEARCH');
            expect(span.domainName).toBe('DB');
            expect(span.tags['operation.type']).toBe('READ');
            expect(span.tags['db.host']).toBe('localhost');
            expect(span.tags['db.port']).toBe(9200);
            expect(span.tags['db.type']).toBe('elasticsearch');
            expect(span.tags['topology.vertex']).toEqual(true);
            expect(span.tags['trigger.domainName']).toEqual('API');
            expect(span.tags['trigger.className']).toEqual('AWS-Lambda');
            expect(span.tags['trigger.operationNames']).toEqual(['functionName']);
            expect(span.tags['elasticsearch.url']).toEqual('/twitter/tweets/_search');
            expect(span.tags['elasticsearch.method']).toEqual('POST');
            
        });
    });
});
