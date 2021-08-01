import ExecutionContextManager from '../../../dist/context/ExecutionContextManager';
import ConfigProvider from '../../../dist/config/ConfigProvider';
import {
    ClassNames,
    DomainNames,
    HttpTags,
    TriggerHeaderTags
} from '../../../dist/Constants';

import HapiMockServer from '../../mock-server/hapi';

import * as HapiWrapper from '../../../dist/wrappers/hapi/HapiWrapper';

import { createMockReporterInstance } from '../../mocks/mocks';

import InitManager from '../../../dist/init/InitManager';

import Thundra from '../../../dist/thundra';

const request = require('supertest');

ConfigProvider.init({ apiKey: 'foo' });

const myPlugin = {
    name: 'myPlugin',
    version: '1.0.0',
    register: async function (server, options) {

        server.ext('onPreHandler', (request, h) =>{
            console.log('onPreHandler');
            return h.continue;
        });
    }
};

describe('Hapijs Wrapper', () => {
    
    const port = '9090';

    let server;
 
    beforeAll(async () => {

        HapiWrapper.init({
            reporter: createMockReporterInstance(),
        });

        // Thundra.init({ apiKey: 'foo' });

        server = await HapiMockServer.start(port);
        //await server.register(myPlugin);
    });
    
    afterAll(() => {
        HapiMockServer.destroy();
    });
    
    beforeEach(() => {
        ExecutionContextManager.useGlobalProvider();
    });

    test('tryer', async () => { 
        const { headers } = await request(server.listener).get('/');
        console.log(headers);
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

        await request(server.listener).get('/error');

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
});