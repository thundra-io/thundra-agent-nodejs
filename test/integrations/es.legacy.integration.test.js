import ESLegacyIntegration from '../../dist/integrations/ESLegacyIntegration';
import ThundraTracer from '../../dist/opentracing/Tracer';
import ES from './utils/es.integration.utils';
import ExecutionContextManager from '../../dist/context/ExecutionContextManager';
import ExecutionContext from '../../dist/context/ExecutionContext';

describe('ES integration', () => {
    let tracer;
    let integration;

    beforeAll(() => {
        tracer = new ThundraTracer();
        ExecutionContextManager.set(new ExecutionContext({ tracer }));
        integration = new ESLegacyIntegration();
    });

    afterEach(() => {
        tracer.destroy();
    });

    test('should instrument ES calls with single host', () => {
        integration.config.esPathDepth = 2;

        const es = require('elasticsearch');

        const client = new es.Client({
            host: 'http://localhost:9200'
        });

        return ES.query(client).then((data) => {
            const span = tracer.getRecorder().spanList[0];
            expect(span.operationName).toBe('/twitter/tweets');
            expect(span.className).toBe('ELASTICSEARCH');
            expect(span.domainName).toBe('DB');

            expect(span.tags['operation.type']).toBe('POST');
            expect(span.tags['db.host']).toBe('localhost');
            expect(span.tags['db.port']).toBe(9200);
            expect(span.tags['db.type']).toBe('elasticsearch');

            expect(span.tags['topology.vertex']).toEqual(true);

            expect(span.tags['elasticsearch.uri']).toEqual('/twitter/tweets/_search');
            expect(span.tags['elasticsearch.normalized_uri']).toEqual('/twitter/tweets');
            expect(span.tags['elasticsearch.method']).toEqual('POST');
            expect(span.tags['elasticsearch.params']).toEqual('{}');
            expect(span.tags['elasticsearch.body']).toEqual('{"query":{"match":{"body":"elasticsearch"}}}');
        });
    });

    test('should instrument ES calls with multiple host', () => {
        integration.config.esPathDepth = 1;

        const hostList = ['localhost', 'test.elastic.io'];
        const portList = [9200, 9201];

        const es = require('elasticsearch');

        const client = new es.Client({
            hosts: ['http://localhost:9200', 'http://test.elastic.io:9200', 'http://test.elastic.io:9201']
        });

        return ES.queryWithMultipleHost(client).then((data) => {
            const span = tracer.getRecorder().spanList[0];
            expect(span.operationName).toBe('/twitter');
            expect(span.className).toBe('ELASTICSEARCH');
            expect(span.domainName).toBe('DB');

            expect(span.tags['operation.type']).toBe('POST');
            expect(hostList).toContain(span.tags['db.host']);
            expect(portList).toContain(span.tags['db.port']);
            expect(span.tags['db.type']).toBe('elasticsearch');

            expect(span.tags['topology.vertex']).toEqual(true);

            expect(span.tags['elasticsearch.uri']).toEqual('/twitter/tweets/_search');
            expect(span.tags['elasticsearch.normalized_uri']).toEqual('/twitter');
            expect(span.tags['elasticsearch.method']).toEqual('POST');
            expect(span.tags['elasticsearch.params']).toEqual('{}');
            expect(span.tags['elasticsearch.body']).toEqual('{"query":{"match":{"body":"elasticsearch"}}}');
        });
    });

    test('should mask ES body', () => {
        integration.config.esPathDepth = 2;
        integration.config.disableInstrumentation = true;
        integration.config.maskElasticSearchBody = true;

        const es = require('elasticsearch');

        const client = new es.Client({
            host: 'http://localhost:9200'
        });

        return ES.query(client).then((data) => {
            const span = tracer.getRecorder().spanList[0];

            expect(span.tags['elasticsearch.params']).not.toBeTruthy();
            expect(span.tags['elasticsearch.body']).not.toBeTruthy();

            expect(span.operationName).toBe('/twitter/tweets');
            expect(span.className).toBe('ELASTICSEARCH');
            expect(span.domainName).toBe('DB');
            expect(span.tags['operation.type']).toBe('POST');
            expect(span.tags['db.host']).toBe('localhost');
            expect(span.tags['db.port']).toBe(9200);
            expect(span.tags['db.type']).toBe('elasticsearch');
            expect(span.tags['topology.vertex']).toEqual(true);
            expect(span.tags['elasticsearch.uri']).toEqual('/twitter/tweets/_search');
            expect(span.tags['elasticsearch.normalized_uri']).toEqual('/twitter/tweets');
            expect(span.tags['elasticsearch.method']).toEqual('POST');
        });
    });
});
