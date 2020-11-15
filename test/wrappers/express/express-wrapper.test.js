import ConfigProvider from '../../../dist/config/ConfigProvider';
import ExecutionContextManager from '../../../dist/context/ExecutionContextManager';
import { createMockExpressApp, createMockReporterInstance } from '../../mocks/mocks';
import { ClassNames, DomainNames, HttpTags, SpanTags } from '../../../dist/Constants';
import { init as initExpressWrapper, expressMW } from '../../../dist/wrappers/express/ExpressWrapper';

const request = require('supertest');
const express = require('express');
const http = require('http');
const methods = require('methods');

ConfigProvider.init({ apiKey: 'foo' });

initExpressWrapper();

const app = createMockExpressApp();

function doRequest(app) {
    var obj = {};

    if (app.server) {
        app = app.server;
    } else if (typeof app === 'function') {
        app = http.createServer(app);
    }

    methods.forEach(function(method) {
        obj[method] = function(url) {
            return new request.Test(app, method, url);
        };
    });

    obj.del = obj.delete;

    return obj;
}

describe('express wrapper', () => {
    beforeEach(() => {
        ExecutionContextManager.useGlobalProvider();
    });

    test('should get correctly', async () => {
        const res = await doRequest(app).get('/');

        expect(res.status).toBe(200);
        expect(res.text).toBe('Hello Thundra!');
    });

    test('should create root span', async () => {
        const res = await doRequest(app).get('/');

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

    test('should trace error', async () => {
        const res = await doRequest(app).get('/error');

        const execContext = ExecutionContextManager.get();
        const spanList = execContext.tracer.getSpanList();
        const rootSpan = spanList[0];

        expect(spanList.length).toBe(1);

        expect(rootSpan.operationName).toBe('/error');
        expect(rootSpan.className).toBe(ClassNames.EXPRESS);
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

        const res = await doRequest(customApp).get('/');

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

    test('should fill execution context', async () => {
        const res = await doRequest(app).get('/');

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

    test('should create invocation data', async () => {
        const res = await doRequest(app).get('/');

        const execContext = ExecutionContextManager.get();
        const { invocationData } = execContext;
        expect(invocationData).toBeTruthy();

        expect(invocationData.applicationId).toBe('node:EXPRESS::thundra-app');
        expect(invocationData.applicationInstanceId).toBeTruthy();
        expect(invocationData.applicationClassName).toBe('EXPRESS');
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
        const res = await doRequest(app)
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

        const supertestAgent = doRequest(customApp);
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

describe('should handle 2 express app calling each other', () => {
    let callerContext;
    let calleeContext;
    let calleeServer;

    const calleePort = 4000;
    const caller = express();
    const callee = express();

    caller.use(expressMW({ reporter: createMockReporterInstance() }));
    callee.use(expressMW({ reporter: createMockReporterInstance() }));

    callee.get('/user', (req, res) => {
        calleeContext = ExecutionContextManager.get();
        res.sendStatus(200);
    });

    caller.get('/', async (req, res) => {
        callerContext = ExecutionContextManager.get();

        const url = `http://localhost:${calleePort}/user`;
        await new Promise(resolve => {
            http.get(url, (resp) => {
                let data = '';
                resp.on('data', (chunk) => {
                    data += chunk;
                });
                resp.on('end', () => {
                    resolve(data);
                });
            }).on('error', (err) => {
                resolve(err);
            });
        });
        res.sendStatus(200);
    });

    beforeAll((done) => {
        calleeServer = callee.listen(calleePort, done);
    });

    afterAll((done) => {
        calleeServer && calleeServer.close(done);
    })

    test('callee should receive caller trace context', async () => {
        await doRequest(caller).get('/');

        expect(calleeContext.traceId).toBe(callerContext.traceId);
        expect(calleeContext.invocationData.incomingTraceLinks).toEqual([callerContext.tracer.getSpanList()[1].spanContext.spanId]);
        expect(calleeContext.invocationData.tags[SpanTags.TRIGGER_OPERATION_NAMES]).toEqual(['localhost/user']);
        expect(calleeContext.invocationData.tags[SpanTags.TRIGGER_CLASS_NAME]).toEqual('HTTP');
        expect(calleeContext.invocationData.tags[SpanTags.TRIGGER_DOMAIN_NAME]).toEqual('API');
        expect(calleeContext.invocationData.incomingTraceLinks).toEqual(callerContext.invocationData.outgoingTraceLinks);
    });
});
