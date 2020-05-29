import HttpIntegration from '../../dist/plugins/integrations/HttpIntegration';
import ThundraTracer from '../../dist/opentracing/Tracer';
import Http from './utils/http.integration.utils';
import InvocationSupport from '../../dist/plugins/support/InvocationSupport';

describe('HTTP integration', () => {
    let tracer;
    let integration;

    beforeAll(() => {
        InvocationSupport.setFunctionName('functionName');
        tracer = new ThundraTracer();
        integration = new HttpIntegration({
            tracer,
        });
    });

    afterEach(() => {
        tracer.destroy();
    });

    test('should instrument HTTP GET calls ', async () => {
        integration.config.httpPathDepth = 2;

        const sdk = require('http');

        await Http.get(sdk);

        const span = tracer.getRecorder().spanList[0];

        expect(span.operationName).toBe('httpstat.us/200');
        expect(span.className).toBe('HTTP');
        expect(span.domainName).toBe('API');

        expect(span.tags['operation.type']).toBe('GET');
        expect(span.tags['http.method']).toBe('GET');
        expect(span.tags['http.host']).toBe('httpstat.us');
        expect(span.tags['http.path']).toBe('/200');
        expect(span.tags['http.url']).toBe('httpstat.us/200?userId=1');
        expect(span.tags['http.query_params']).toBe('userId=1');
        expect(span.tags['http.status_code']).toBe(200);
        expect(span.tags['topology.vertex']).toEqual(true);
        expect(span.tags['trigger.domainName']).toEqual('API');
        expect(span.tags['trigger.className']).toEqual('AWS-Lambda');
        expect(span.tags['trigger.operationNames']).toEqual(['functionName']);
        expect(span.tags['http.body']).not.toBeTruthy();
    });

    test('should set 4XX 5XX errors on HTTP calls', async () => {
        integration.config.httpPathDepth = 2;
        const sdk = require('http');
        await Http.getError(sdk);

        const span = tracer.getRecorder().spanList[0];
        expect(span.operationName).toBe('httpstat.us/404');
        expect(span.className).toBe('HTTP');
        expect(span.domainName).toBe('API');

        expect(span.tags['operation.type']).toBe('GET');
        expect(span.tags['http.method']).toBe('GET');
        expect(span.tags['http.host']).toBe('httpstat.us');
        expect(span.tags['http.path']).toBe('/404');
        expect(span.tags['http.url']).toBe('httpstat.us/404');
        expect(span.tags['http.status_code']).toBe(404);
        expect(span.tags['error']).toBe(true);
        expect(span.tags['error.kind']).toBe('HttpError');
        expect(span.tags['error.message']).toBe('Not Found');
        expect(span.tags['topology.vertex']).toEqual(true);
        expect(span.tags['trigger.domainName']).toEqual('API');
        expect(span.tags['trigger.className']).toEqual('AWS-Lambda');
        expect(span.tags['trigger.operationNames']).toEqual(['functionName']);
        expect(span.tags['http.body']).not.toBeTruthy();
    });

    test('should disable 4XX 5XX errors on HTTP calls', async () => {
        integration.config.disableHttp4xxError = true;
        const sdk = require('http');

        await Http.getError(sdk);
        const span = tracer.getRecorder().spanList[0];
        expect(span.operationName).toBe('httpstat.us/404');
        expect(span.className).toBe('HTTP');
        expect(span.domainName).toBe('API');

        expect(span.tags['operation.type']).toBe('GET');
        expect(span.tags['http.method']).toBe('GET');
        expect(span.tags['http.host']).toBe('httpstat.us');
        expect(span.tags['http.path']).toBe('/404');
        expect(span.tags['http.url']).toBe('httpstat.us/404');
        expect(span.tags['http.status_code']).toBe(404);
        expect(span.tags['error']).toBe(undefined);
        expect(span.tags['error.kind']).toBe(undefined);
        expect(span.tags['error.message']).toBe(undefined);
        expect(span.tags['topology.vertex']).toEqual(true);
        expect(span.tags['trigger.domainName']).toEqual('API');
        expect(span.tags['trigger.className']).toEqual('AWS-Lambda');
        expect(span.tags['trigger.operationNames']).toEqual(['functionName']);
        expect(span.tags['http.body']).not.toBeTruthy();
    });

    test('should instrument HTTPS POST calls', async () => {
        integration.config.httpPathDepth = 0;
        const sdk = require('https');

        await Http.post(sdk)
        const span = tracer.getRecorder().spanList[0];

        expect(span.operationName).toBe('flaviocopes.com');
        expect(span.className).toBe('HTTP');
        expect(span.domainName).toBe('API');

        expect(span.tags['http.method']).toBe('POST');
        expect(span.tags['http.body']).toBe('{"todo":"Buy the milk"}');
    });

    test('should mask body in post', async () => {
        integration.config.maskHttpBody = true;
        const sdk = require('https');

        await Http.post(sdk);
        
        const span = tracer.getRecorder().spanList[0];

        expect(span.operationName).toBe('flaviocopes.com');
        expect(span.className).toBe('HTTP');
        expect(span.domainName).toBe('API');

        expect(span.tags['http.method']).toBe('POST');
        expect(span.tags['http.body']).not.toBeTruthy();
    });

    test('should instrument api gateway calls ', () => {
        const apiGatewayEndpoint = 'hivcx7cj2j.execute-api.us-west-2.amazonaws.com/dev';
        const okEndpoint = 'google.com';
        const awsEndPoint = 'dynamodb.us-west-2.amazonaws.com';

        expect(HttpIntegration.isValidUrl(apiGatewayEndpoint)).toBe(true);
        expect(HttpIntegration.isValidUrl(awsEndPoint)).toBe(false);
        expect(HttpIntegration.isValidUrl(okEndpoint)).toBe(true);
    });
});