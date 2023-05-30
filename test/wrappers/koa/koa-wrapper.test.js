import { 
    createMockKoaApp,
    createMockReporterInstance
} from "../../mocks/mocks";
import ConfigProvider from "../../../dist/config/ConfigProvider";
import * as KoaWrapper from '../../../dist/wrappers/koa/KoaWrapper';
import ExecutionContextManager from "../../../dist/context/ExecutionContextManager";
import { 
    ClassNames,
    DomainNames,
    HttpTags,
    SpanTags
} from "../../../dist/Constants";

import Koa from 'koa';

const request = require('supertest');

describe('koa wrapper', function () {

    let app;

    let server;

    const port = 9091

    ConfigProvider.init({apiKey: 'foo'});

    beforeAll(() => {
       
        ConfigProvider.init({ apiKey: 'foo' });

        KoaWrapper.__PRIVATE__.getReporter = jest.fn(() => createMockReporterInstance());

        KoaWrapper.init();

        if (!app) {
            app = createMockKoaApp();
            server = app.listen(port);
        }
    })

    afterAll(() => {
        if (server) {
            server.close();
        }
    });

    beforeEach(() => {
        ExecutionContextManager.useGlobalProvider();
    })


    test('should get correctly', async () => {
        const response = await request(app.callback()).get('/');
        expect(response.status).toBe(200);
        expect(response.text).toBe('Hello Thundra!');
    });

    test('should create root span', async () => {
        await request(app.callback()).get('/');

        const execContext = ExecutionContextManager.get();
        const spanList = execContext.tracer.getSpanList();
        const rootSpan = spanList[0];

        expect(spanList.length).toBe(1);

        expect(rootSpan.operationName).toBe('/');
        expect(rootSpan.className).toBe(ClassNames.KOA);
        expect(rootSpan.domainName).toBe(DomainNames.API);
        expect(rootSpan.startTime).toBeTruthy();
        expect(rootSpan.finishTime).toBeTruthy();

        expect(rootSpan.tags[HttpTags.HTTP_HOST]).toBe('127.0.0.1');
        expect(rootSpan.tags[HttpTags.HTTP_PATH]).toBe('/');
        expect(rootSpan.tags[HttpTags.HTTP_STATUS]).toBe(200);
    });

    test('should trace error', async () => {
        await request(app.callback()).get('/error');

        const execContext = ExecutionContextManager.get();
        const spanList = execContext.tracer.getSpanList();
        const rootSpan = spanList[0];

        expect(spanList.length).toBe(1);

        expect(rootSpan.operationName).toBe('/error');
        expect(rootSpan.className).toBe(ClassNames.KOA);
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

    test('should connect custom spans', async () => {
        const wait = (ms) => new Promise(r => setTimeout(r, ms));
        const doSomeWork = (spanName) => new Promise((res, rej) => {
            setTimeout(async () => {
                const {tracer} = ExecutionContextManager.get();
                const span = tracer.startSpan(spanName);
                await wait(100);
                span.finish();
                res();
            }, 0);
        });

        let execContext;

        const customApp = new Koa();

        customApp.use(async (ctx, next) => {
            if (ctx.path !== '/') {
                return await next();
            }
            execContext = ExecutionContextManager.get();
            await doSomeWork('customSpan1');
            await doSomeWork('customSpan2');

            ctx.statusCode = 200;
        });

        await request(customApp.callback()).get('/');

        const spanList = execContext.tracer.getSpanList();
        const rootSpan = spanList[0];
        const customSpan1 = spanList[1];
        const customSpan2 = spanList[2];
        const rootSpanId = rootSpan.spanContext.spanId;
        const {transactionId, traceId} = rootSpan.spanContext;

        // Check span count
        expect(spanList.length).toBe(3);

        // Check root span
        expect(rootSpan.operationName).toBe('/');
        expect(rootSpan.className).toBe(ClassNames.KOA);
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

        // Check first custom span
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


    test('should create invocation data', async () => {
        await request(app.callback()).get('/');

        const execContext = ExecutionContextManager.get();
        const {invocationData} = execContext;
        expect(invocationData).toBeTruthy();

        expect(invocationData.applicationId).toBe('node:Koa::thundra-app');
        expect(invocationData.applicationInstanceId).toBeTruthy();
        expect(invocationData.applicationClassName).toBe('Koa');
        expect(invocationData.applicationDomainName).toBe('API');
        expect(invocationData.startTimestamp).toBeTruthy();
        expect(invocationData.finishTimestamp).toBeTruthy();
        expect(invocationData.duration).toBeGreaterThanOrEqual(0);
        expect(invocationData.erroneous).toBeFalsy();
        expect(invocationData.transactionId).toBeTruthy();
        expect(invocationData.traceId).toBeTruthy();
        expect(invocationData.spanId).toBeTruthy();
    });

    test('should pass trace context', async () => {
        await request(app.callback())
            .get('/')
            .set('x-catchpoint-transaction-id', 'incomingTransactionId')
            .set('x-catchpoint-trace-id', 'incomingTraceId')
            .set('x-catchpoint-span-id', 'incomingSpanId')
            .set('x-catchpoint-resource-name', 'incomingResourceName');

        const execContext = ExecutionContextManager.get();
        const {invocationData} = execContext;

        expect(invocationData.traceId).toBe('incomingTraceId');
        expect(invocationData.incomingTraceLinks).toEqual(['incomingSpanId']);
        expect(invocationData.tags[SpanTags.TRIGGER_OPERATION_NAMES]).toEqual(['127.0.0.1/']);
        expect(invocationData.tags[SpanTags.TRIGGER_CLASS_NAME]).toEqual('HTTP');
        expect(invocationData.tags[SpanTags.TRIGGER_DOMAIN_NAME]).toEqual('API');
    });

    test('should handle parallel requests', async () => {
        const wait = (ms) => new Promise(r => setTimeout(r, ms));
        const doSomeWork = (spanName) => new Promise((res, rej) => {
            setTimeout(async () => {
                const {tracer} = ExecutionContextManager.get();
                const span = tracer.startSpan(spanName);
                await wait(100);
                span.finish();
                res();
            }, 0);
        });

        let execContexts = [];

        const customApp = new Koa();

        customApp.use(async (ctx, next) => {
            if (ctx.path !== '/') {
                return await next();
            }
            execContexts.push(ExecutionContextManager.get());
            await doSomeWork('customSpan1');
            await doSomeWork('customSpan2');

            ctx.statusCode = 200;
        });

        const supertestAgent = request(app.callback());
        const promises = [];
        const reqCount = 5;

        for (let i = 0; i < reqCount; i++) {
            promises.push(supertestAgent.get('/'));
        }

        await Promise.all(promises);

        const verifyExecContext = (execContext) => {
            const spanList = execContext.tracer.getSpanList();
            const rootSpan = spanList[0];
            const customSpan1 = spanList[1];
            const customSpan2 = spanList[2];
            const rootSpanId = rootSpan.spanContext.spanId;
            const {transactionId, traceId} = rootSpan.spanContext;

            // Check span count
            expect(spanList.length).toBe(3);

            // Check root span
            expect(rootSpan.operationName).toBe('/');
            expect(rootSpan.className).toBe(ClassNames.EXPRESS);
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

            // Check first custom span
            expect(customSpan2.operationName).toBe('customSpan2');
            expect(customSpan2.className).toBeUndefined();
            expect(customSpan2.domainName).toBeUndefined();
            expect(customSpan2.startTime).toBeTruthy();
            expect(customSpan2.finishTime).toBeTruthy();
            expect(customSpan2.getDuration()).toBeGreaterThan(95);
            expect(customSpan2.spanContext.transactionId).toBe(transactionId);
            expect(customSpan2.spanContext.parentId).toBe(rootSpanId);
            expect(customSpan2.spanContext.traceId).toBe(traceId);
        };

        for (const execContext of execContexts) {
            verifyExecContext(execContext);
        }
    });
});
