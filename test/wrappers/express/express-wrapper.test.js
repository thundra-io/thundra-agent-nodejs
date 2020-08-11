import ConfigProvider from '../../../dist/config/ConfigProvider';
import ExecutionContextManager from '../../../dist/context/ExecutionContextManager';
import { createMockExpressApp } from '../../mocks/mocks';
import { ClassNames, DomainNames, HttpTags } from '../../../dist/Constants';

const request = require('supertest');

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
});
