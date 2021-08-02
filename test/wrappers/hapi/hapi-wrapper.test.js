import ExecutionContextManager from '../../../dist/context/ExecutionContextManager';
import ConfigProvider from '../../../dist/config/ConfigProvider';
import {
    ClassNames,
    DomainNames,
    HttpTags,
    TriggerHeaderTags,
    SpanTags
} from '../../../dist/Constants';

import HapiMockServer from '../../mock-server/hapi';

import * as HapiWrapper from '../../../dist/wrappers/hapi/HapiWrapper';

import { createMockReporterInstance } from '../../mocks/mocks';

import request from 'supertest';

describe('Hapijs Wrapper Tests', () => {
    
    const port = '9090';

    let server;
 
    beforeAll(async () => {

        ConfigProvider.init({ apiKey: 'foo' });

        HapiWrapper.__PRIVETE__.createReporter = jest.fn(() => createMockReporterInstance());
        HapiWrapper.init({
            reporter: createMockReporterInstance(),
        });

        server = await HapiMockServer.start(port);
    });
    
    afterAll(() => {
        HapiMockServer.destroy();
    });
    
    beforeEach(() => {
        ExecutionContextManager.useGlobalProvider();
    });

    test('should create root span', async () => {

        const { headers } = await request(server.listener).get('/');

        expect(headers[TriggerHeaderTags.RESOURCE_NAME]).toBeTruthy();

        const execContext = ExecutionContextManager.get();
        const spanList = execContext.tracer.getSpanList();
        const rootSpan = spanList[0];

        expect(spanList.length).toBe(1);

        expect(rootSpan.operationName).toBe('/');
        expect(rootSpan.className).toBe(ClassNames.HAPI);
        expect(rootSpan.domainName).toBe(DomainNames.API);
        expect(rootSpan.startTime).toBeTruthy();
        expect(rootSpan.finishTime).toBeTruthy();

        expect(rootSpan.tags[HttpTags.HTTP_HOST]).toBe('127.0.0.1');
        expect(rootSpan.tags[HttpTags.HTTP_PATH]).toBe('/');
        expect(rootSpan.tags[HttpTags.HTTP_STATUS]).toBe(200);
    });

    test('should trace error', async () => {

        const { headers } = await request(server.listener).get('/error');

        expect(headers[TriggerHeaderTags.RESOURCE_NAME]).toBeTruthy();

        const execContext = ExecutionContextManager.get();
        const spanList = execContext.tracer.getSpanList();
        const rootSpan = spanList[0];

        expect(spanList.length).toBe(1);

        expect(rootSpan.operationName).toBe('/error');
        expect(rootSpan.className).toBe(ClassNames.HAPI);
        expect(rootSpan.domainName).toBe(DomainNames.API);
        expect(rootSpan.startTime).toBeTruthy();
        expect(rootSpan.finishTime).toBeTruthy();

        expect(rootSpan.tags['error']).toBeTruthy();
        expect(rootSpan.tags['error.kind']).toBe('APIError');
        expect(rootSpan.tags['error.message']).toBe('Boom');

        expect(rootSpan.tags[HttpTags.HTTP_HOST]).toBe('127.0.0.1');
        expect(rootSpan.tags[HttpTags.HTTP_PATH]).toBe('/error');
        expect(rootSpan.tags[HttpTags.HTTP_STATUS]).toBe(500);
    });

    test('should trace 404 not found', async () => {
        
        const { headers } = await request(server.listener).get('/404');

        expect(headers[TriggerHeaderTags.RESOURCE_NAME]).toBeTruthy();

        const execContext = ExecutionContextManager.get();
        const spanList = execContext.tracer.getSpanList();
        const rootSpan = spanList[0];

        expect(spanList.length).toBe(1);

        expect(rootSpan.operationName).toBe('/404');
        expect(rootSpan.className).toBe(ClassNames.HAPI);
        expect(rootSpan.domainName).toBe(DomainNames.API);
        expect(rootSpan.startTime).toBeTruthy();
        expect(rootSpan.finishTime).toBeTruthy();

        expect(rootSpan.tags['error']).toBeTruthy();

        expect(rootSpan.tags[HttpTags.HTTP_HOST]).toBe('127.0.0.1');
        expect(rootSpan.tags[HttpTags.HTTP_PATH]).toBe('/404');
        expect(rootSpan.tags[HttpTags.HTTP_STATUS]).toBe(404);
    });

    test('should pass trace context', async () => {

        await request(server.listener)
            .get('/')
            .set('x-thundra-transaction-id', 'incomingTransactionId')
            .set('x-thundra-trace-id', 'incomingTraceId')
            .set('x-thundra-span-id', 'incomingSpanId')
            .set('x-thundra-resource-name', 'incomingResourceName');

        const execContext = ExecutionContextManager.get();
        const { invocationData } = execContext;

        expect(invocationData.traceId).toBe('incomingTraceId');
        expect(invocationData.incomingTraceLinks).toEqual(['incomingSpanId']);
        expect(invocationData.tags[SpanTags.TRIGGER_OPERATION_NAMES]).toEqual(['127.0.0.1/']);
        expect(invocationData.tags[SpanTags.TRIGGER_CLASS_NAME]).toEqual('HTTP');
        expect(invocationData.tags[SpanTags.TRIGGER_DOMAIN_NAME]).toEqual('API');
    });

    test('should fill execution context', async () => {

        await request(server.listener).get('/', () => {
            const execContext = ExecutionContextManager.get();

            expect(execContext.startTimestamp).toBeTruthy();
            expect(execContext.finishTimestamp).toBeTruthy();
            expect(execContext.tracer).toBeTruthy();
            expect(execContext.reports).toBeTruthy();
            expect(execContext.reports.length).toBe(2);
            expect(execContext.spanId).toBeTruthy();
            expect(execContext.traceId).toBeTruthy();
            expect(execContext.rootSpan).toBeTruthy();
            expect(execContext.invocationData).toBeTruthy();
            expect(execContext.invocationData).toBeTruthy();
        });
    });

    test('should create invocation data', async () => {
        await request(server.listener).get('/');

        const execContext = ExecutionContextManager.get();
        const {invocationData} = execContext;
        expect(invocationData).toBeTruthy();

        expect(invocationData.applicationId).toBe('node:Hapi::thundra-app');
        expect(invocationData.applicationInstanceId).toBeTruthy();
        expect(invocationData.applicationClassName).toBe('Hapi');
        expect(invocationData.applicationDomainName).toBe('API');
        expect(invocationData.startTimestamp).toBeTruthy();
        expect(invocationData.finishTimestamp).toBeTruthy();
        expect(invocationData.duration).toBeGreaterThanOrEqual(0);
        expect(invocationData.erroneous).toBeFalsy();
        expect(invocationData.transactionId).toBeTruthy();
        expect(invocationData.traceId).toBeTruthy();
        expect(invocationData.spanId).toBeTruthy();
    });

    test('Hapijs Wrapper Custom Span Tests', async () => {

        let execContext;

        const wait = (ms) => new Promise(r => setTimeout(r, ms));
    
        const doSomeWork = (spanName) => new Promise((res, rej) => {
            setTimeout(async () => {
                const { tracer } = ExecutionContextManager.get();
                const span = tracer.startSpan(spanName);
                await wait(100);
                span.finish();
                res();
            }, 0);
        });

        server.route([{
            method: 'GET',
            path: '/custom-spans',
            handler: async (request, h) => {
                execContext = ExecutionContextManager.get();
                await doSomeWork('customSpan1');
                await doSomeWork('customSpan2');

                return 'ok';
            }
        }]);

        await request(server.listener).get('/custom-spans');

        const spanList = execContext.tracer.getSpanList();
        const rootSpan = spanList[0];
        const customSpan1 = spanList[1];
        const customSpan2 = spanList[2];
        const rootSpanId = rootSpan.spanContext.spanId;
        const {transactionId, traceId} = rootSpan.spanContext;

        // Check span count
        expect(spanList.length).toBe(3);

        // Check root span
        expect(rootSpan.operationName).toBe('/custom-spans');
        expect(rootSpan.className).toBe(ClassNames.HAPI);
        expect(rootSpan.domainName).toBe(DomainNames.API);
        expect(rootSpan.startTime).toBeTruthy();
        expect(rootSpan.finishTime).toBeTruthy();
        expect(rootSpan.getDuration()).toBeGreaterThan(190);

        // Check first custom span
        expect(customSpan1.operationName).toBe('customSpan1');
        expect(customSpan1.className).toBeUndefined();
        expect(customSpan1.domainName).toBeUndefined();
        expect(customSpan1.startTime).toBeTruthy();
        expect(customSpan1.finishTime).toBeTruthy();
        expect(customSpan1.getDuration()).toBeGreaterThan(95);
        expect(customSpan1.spanContext.transactionId).toBe(transactionId);
        expect(customSpan1.spanContext.parentId).toBe(rootSpanId);
        expect(customSpan1.spanContext.traceId).toBe(traceId);

        // Check second custom span
        expect(customSpan2.operationName).toBe('customSpan2');
        expect(customSpan2.className).toBeUndefined();
        expect(customSpan2.domainName).toBeUndefined();
        expect(customSpan2.startTime).toBeTruthy();
        expect(customSpan2.finishTime).toBeTruthy();
        expect(customSpan2.getDuration()).toBeGreaterThan(95);
        expect(customSpan2.spanContext.transactionId).toBe(transactionId);
        expect(customSpan2.spanContext.parentId).toBe(rootSpanId);
        expect(customSpan2.spanContext.traceId).toBe(traceId);
    });
});