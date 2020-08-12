import ConfigProvider from '../../../dist/config/ConfigProvider';
import ExecutionContextManager from '../../../dist/context/ExecutionContextManager';
import { createMockExpressApp, createMockReporterInstance } from '../../mocks/mocks';
import { ClassNames, DomainNames, HttpTags } from '../../../dist/Constants';
import { expressMW } from '../../../dist/wrappers/express/ExpressWrapper';

const request = require('supertest');
const express = require('express');

ConfigProvider.init({ apiKey: 'foo' });

const app = createMockExpressApp();

describe('express wrapper', () => {
    test('should get correctly', async () => {
        const res = await request(app).get('/');

        expect(res.status).toBe(200);
        expect(res.text).toBe('Hello Thundra!');
    });

    test('should create root span', async () => {
        const res = await request(app).get('/');

        const execContext = ExecutionContextManager.get();
        const spanList = execContext.tracer.getSpanList();
        const rootSpan = spanList[0];

        expect(spanList.length).toBe(1);

        expect(rootSpan.operationName).toBe('/');
        expect(rootSpan.className).toBe(ClassNames.EXPRESS);
        expect(rootSpan.domainName).toBe(DomainNames.API);
        expect(rootSpan.startTime).toBeTruthy();
        expect(rootSpan.finishTime).toBeTruthy();

        expect(rootSpan.tags[HttpTags.HTTP_HOST]).toBe('127.0.0.1');
        expect(rootSpan.tags[HttpTags.HTTP_PATH]).toBe('/');
        expect(rootSpan.tags[HttpTags.HTTP_STATUS]).toBe(200);
    });

    test('should connect custom spans', async () => {
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

        let execContext;

        const customApp = express();

        customApp.use(expressMW({
            reporter: createMockReporterInstance(),
        }));

        customApp.get('/', async (req, res) => {
            execContext = ExecutionContextManager.get();
            await doSomeWork('customSpan1');
            await doSomeWork('customSpan2');

            res.sendStatus(200);
        });

        const res = await request(customApp).get('/');

        const spanList = execContext.tracer.getSpanList();
        const rootSpan = spanList[0];
        const customSpan1 = spanList[1];
        const customSpan2 = spanList[2];
        const rootSpanId = rootSpan.spanContext.spanId;
        const { transactionId, traceId } = rootSpan.spanContext;

        // Check span count
        expect(spanList.length).toBe(3);

        // Check root span
        expect(rootSpan.operationName).toBe('/');
        expect(rootSpan.className).toBe(ClassNames.EXPRESS);
        expect(rootSpan.domainName).toBe(DomainNames.API);
        expect(rootSpan.startTime).toBeTruthy();
        expect(rootSpan.finishTime).toBeTruthy();
        expect(rootSpan.getDuration()).toBeGreaterThan(200);

        // Check first custom span
        expect(customSpan1.operationName).toBe('customSpan1');
        expect(customSpan1.className).toBeUndefined();
        expect(customSpan1.domainName).toBeUndefined();
        expect(customSpan1.startTime).toBeTruthy();
        expect(customSpan1.finishTime).toBeTruthy();
        expect(customSpan1.getDuration()).toBeGreaterThan(100);
        expect(customSpan1.spanContext.transactionId).toBe(transactionId);
        expect(customSpan1.spanContext.parentId).toBe(rootSpanId);
        expect(customSpan1.spanContext.traceId).toBe(traceId);

        // Check first custom span
        expect(customSpan2.operationName).toBe('customSpan2');
        expect(customSpan2.className).toBeUndefined();
        expect(customSpan2.domainName).toBeUndefined();
        expect(customSpan2.startTime).toBeTruthy();
        expect(customSpan2.finishTime).toBeTruthy();
        expect(customSpan2.getDuration()).toBeGreaterThan(100);
        expect(customSpan2.spanContext.transactionId).toBe(transactionId);
        expect(customSpan2.spanContext.parentId).toBe(rootSpanId);
        expect(customSpan2.spanContext.traceId).toBe(traceId);
    });

    test('should handle parallel requests', async () => {
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

        let execContexts = [];

        const customApp = express();

        customApp.use(expressMW({
            reporter: createMockReporterInstance(),
        }));

        customApp.get('/', async (req, res) => {
            execContexts.push(ExecutionContextManager.get());
            await doSomeWork('customSpan1');
            await doSomeWork('customSpan2');
            
            res.sendStatus(200);
        });

        const supertestAgent = request(customApp);
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
            const { transactionId, traceId } = rootSpan.spanContext;

            // Check span count
            expect(spanList.length).toBe(3);

            // Check root span
            expect(rootSpan.operationName).toBe('/');
            expect(rootSpan.className).toBe(ClassNames.EXPRESS);
            expect(rootSpan.domainName).toBe(DomainNames.API);
            expect(rootSpan.startTime).toBeTruthy();
            expect(rootSpan.finishTime).toBeTruthy();
            expect(rootSpan.getDuration()).toBeGreaterThan(200);

            // Check first custom span
            expect(customSpan1.operationName).toBe('customSpan1');
            expect(customSpan1.className).toBeUndefined();
            expect(customSpan1.domainName).toBeUndefined();
            expect(customSpan1.startTime).toBeTruthy();
            expect(customSpan1.finishTime).toBeTruthy();
            expect(customSpan1.getDuration()).toBeGreaterThan(100);
            expect(customSpan1.spanContext.transactionId).toBe(transactionId);
            expect(customSpan1.spanContext.parentId).toBe(rootSpanId);
            expect(customSpan1.spanContext.traceId).toBe(traceId);

            // Check first custom span
            expect(customSpan2.operationName).toBe('customSpan2');
            expect(customSpan2.className).toBeUndefined();
            expect(customSpan2.domainName).toBeUndefined();
            expect(customSpan2.startTime).toBeTruthy();
            expect(customSpan2.finishTime).toBeTruthy();
            expect(customSpan2.getDuration()).toBeGreaterThan(100);
            expect(customSpan2.spanContext.transactionId).toBe(transactionId);
            expect(customSpan2.spanContext.parentId).toBe(rootSpanId);
            expect(customSpan2.spanContext.traceId).toBe(traceId);
        }

        for (const execContext of execContexts) {
            verifyExecContext(execContext);
        }
    });
});
