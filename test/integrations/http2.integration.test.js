import PATH from 'path';
import URL from 'url';
import { constants as HTTP2Constants } from 'http2';

import Http2Integration from '../../dist/integrations/Http2Integration';
import ThundraTracer from '../../dist/opentracing/Tracer';
import ExecutionContextManager from '../../dist/context/ExecutionContextManager';
import ExecutionContext from '../../dist/context/ExecutionContext';

import { 
    HttpTags, 
    SpanTags, 
    DomainNames, 
    ClassNames 
} from '../../dist/Constants';

import HTTP2MockServer from '../mock-server';
import HTTP2Util from './utils/http2.integration.utils';

describe('HTTP2 integration', () => {
    
    const port = '8443';
    const serverUrl = new URL.URL(`https://localhost:${port}`);
    const caPath = PATH.resolve(__dirname, '../mock-server/cert/http2-cert.pem');
    
    let tracer;
    let integration;
    
    beforeAll(() => {
        HTTP2MockServer.start(port);
        
        tracer = new ThundraTracer();
        ExecutionContextManager.set(new ExecutionContext({ tracer }));
        integration = new Http2Integration();
    });
    
    afterAll(() => {
        HTTP2MockServer.destroy();
        
        tracer.destroy();
    });
    
    afterEach(() => {
        tracer.destroy();
    });
    
    test('should instrument HTTP2 POST calls ', async () => {
        integration.config.httpPathDepth = 2;
        
        const http2Client = HTTP2Util.http2Client(serverUrl, { caPath });
        
        const path = '/post';
        
        const payload = {
            testField: 'testFieldValue'
        };       
        
        await http2Client.request({
            method: HTTP2Constants.HTTP2_METHOD_POST,
            path,
            payload
        });
        
        http2Client.close();
        
        const expectedUrl = `${serverUrl.hostname}${path}`;
        
        const span = tracer.getRecorder().spanList[0];
        
        expect(span.className).toBe(ClassNames.HTTP);
        expect(span.domainName).toBe(DomainNames.API);
        
        expect(span.tags[SpanTags.OPERATION_TYPE]).toBe(HTTP2Constants.HTTP2_METHOD_POST);
        expect(span.tags[HttpTags.HTTP_METHOD]).toBe(HTTP2Constants.HTTP2_METHOD_POST);
        expect(span.tags[HttpTags.HTTP_HOST]).toBe(serverUrl.hostname);
        expect(span.tags[HttpTags.HTTP_PATH]).toBe(path);
        expect(span.tags[HttpTags.HTTP_URL]).toBe(expectedUrl);
        expect(span.tags[HttpTags.HTTP_STATUS]).toBe(200);
        expect(span.tags['error']).toBe(undefined);
        expect(span.tags['error.kind']).toBe(undefined);
        expect(span.tags['error.message']).toBe(undefined);
        expect(span.tags[SpanTags.TOPOLOGY_VERTEX]).toEqual(true);
        expect(span.tags[HttpTags.BODY]).toBeTruthy();
    });

    test('should instrument 5XX errors on HTTP calls', async () => {
       
        const http2Client = HTTP2Util.http2Client(serverUrl, { caPath });
        
        const path = '/500';
        
        await http2Client.request({
            method: HTTP2Constants.HTTP2_METHOD_GET,
            path
        });
        
        http2Client.close();
        
        const expectedUrl = `${serverUrl.hostname}${path}`;
        
        const span = tracer.getRecorder().spanList[0];

        expect(span.operationName).toBe(expectedUrl);
        expect(span.className).toBe(ClassNames.HTTP);
        expect(span.domainName).toBe(DomainNames.API);
        
        expect(span.tags[SpanTags.OPERATION_TYPE]).toBe(HTTP2Constants.HTTP2_METHOD_GET);
        expect(span.tags[HttpTags.HTTP_METHOD]).toBe(HTTP2Constants.HTTP2_METHOD_GET);
        expect(span.tags[HttpTags.HTTP_HOST]).toBe(serverUrl.hostname);
        expect(span.tags[HttpTags.HTTP_PATH]).toBe(path);
        expect(span.tags[HttpTags.HTTP_URL]).toBe(expectedUrl);
        expect(span.tags[HttpTags.HTTP_STATUS]).toBe(500);
        expect(span.tags['error']).not.toBeUndefined();
        expect(span.tags['error.kind']).not.toBeUndefined();
        expect(span.tags['error.message']).not.toBeUndefined();
        expect(span.tags[SpanTags.TOPOLOGY_VERTEX]).toEqual(true);
        expect(span.tags[HttpTags.BODY]).not.toBeTruthy();
    });
    
    test('should disable 4XX errors on HTTP calls', async () => {
        integration.config.disableHttp4xxError = true;
        
        const http2Client = HTTP2Util.http2Client(serverUrl, { caPath });
        
        const path = '/404';
        
        await http2Client.request({
            method: HTTP2Constants.HTTP2_METHOD_GET,
            path
        });
        
        http2Client.close();
        
        const expectedUrl = `${serverUrl.hostname}${path}`;
        
        const span = tracer.getRecorder().spanList[0];
        expect(span.operationName).toBe(expectedUrl);
        expect(span.className).toBe(ClassNames.HTTP);
        expect(span.domainName).toBe(DomainNames.API);
        
        expect(span.tags[SpanTags.OPERATION_TYPE]).toBe(HTTP2Constants.HTTP2_METHOD_GET);
        expect(span.tags[HttpTags.HTTP_METHOD]).toBe(HTTP2Constants.HTTP2_METHOD_GET);
        expect(span.tags[HttpTags.HTTP_HOST]).toBe(serverUrl.hostname);
        expect(span.tags[HttpTags.HTTP_PATH]).toBe(path);
        expect(span.tags[HttpTags.HTTP_URL]).toBe(expectedUrl);
        expect(span.tags[HttpTags.HTTP_STATUS]).toBe(404);
        expect(span.tags['error']).toBe(undefined);
        expect(span.tags['error.kind']).toBe(undefined);
        expect(span.tags['error.message']).toBe(undefined);
        expect(span.tags[SpanTags.TOPOLOGY_VERTEX]).toEqual(true);
        expect(span.tags[HttpTags.BODY]).not.toBeTruthy();
    });

    test('should mask body in post', async () => {
        integration.config.maskHttpBody = true;
        
        const http2Client = HTTP2Util.http2Client(serverUrl, { caPath });
        
        const path = '/post';
        
        const payload = {
            testField: 'testFieldValue'
        };       
        
        await http2Client.request({
            method: HTTP2Constants.HTTP2_METHOD_POST,
            path,
            payload
        });
        
        http2Client.close();
        
        const expectedUrl = `${serverUrl.hostname}${path}`;
        
        const span = tracer.getRecorder().spanList[0];
        
        expect(span.operationName).toBe(expectedUrl);
        expect(span.className).toBe(ClassNames.HTTP);
        expect(span.domainName).toBe(DomainNames.API);
        
        expect(span.tags[HttpTags.HTTP_METHOD]).toBe(HTTP2Constants.HTTP2_METHOD_POST);
        expect(span.tags['http.body']).not.toBeTruthy();
    });
});