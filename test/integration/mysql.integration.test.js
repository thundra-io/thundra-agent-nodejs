import MySQL2Integration from '../../dist/plugins/integrations/MySQL2Integration';
import MySQLIntegration from '../../dist/plugins/integrations/MySQLIntegration';
import ThundraTracer from '../../dist/opentracing/Tracer';
import InvocationSupport from '../../dist/plugins/support/InvocationSupport';
import mysql from './utils/mysql.integration.utils';

describe('MySQL2 integration', () => {
    let tracer;
    let integration;

    beforeAll(() => {
        InvocationSupport.setFunctionName('functionName');
        tracer = new ThundraTracer();
        integration = new MySQL2Integration({
            tracer,
        });
    });

    afterEach(() => {
        tracer.destroy();
    });

    InvocationSupport.setFunctionName('functionName');

    test('should instrument MySQL calls with mysql2 client', () => {
        const sdk = require('mysql2');

        return mysql.selectMySql2(sdk).then((data) => {
            const span = tracer.getRecorder().spanList[0];
            expect(span.className).toBe('MYSQL');
            expect(span.domainName).toBe('DB');

            expect(span.tags['operation.type']).toBe('READ');
            expect(span.tags['db.instance']).toBe('db');
            expect(span.tags['db.user']).toBe('user');
            expect(span.tags['db.host']).toBe('localhost');
            expect(span.tags['db.port']).toBe(3306);
            expect(span.tags['db.type']).toBe('mysql');
            expect(span.tags['db.statement.type']).toBe('SELECT');
            expect(span.tags['db.statement']).toBe('SELECT 1 + 1 AS solution');
            expect(span.tags['topology.vertex']).toEqual(true);
            expect(span.tags['trigger.domainName']).toEqual('API');
            expect(span.tags['trigger.className']).toEqual('AWS-Lambda');
            expect(span.tags['trigger.operationNames']).toEqual(['functionName']);
        });
    });

    test('should mask MySQL statements with mysql2 client', () => {
        integration.config.disableInstrumentation = true;
        integration.config.maskRdbStatement = true;
        const sdk = require('mysql2');

        return mysql.selectMySql2(sdk).then((data) => {
            const span = tracer.getRecorder().spanList[0];

            expect(span.tags['db.statement']).not.toBeTruthy();

            expect(span.className).toBe('MYSQL');
            expect(span.domainName).toBe('DB');
            expect(span.tags['operation.type']).toBe('READ');
            expect(span.tags['db.instance']).toBe('db');
            expect(span.tags['db.user']).toBe('user');
            expect(span.tags['db.host']).toBe('localhost');
            expect(span.tags['db.port']).toBe(3306);
            expect(span.tags['db.type']).toBe('mysql');
            expect(span.tags['db.statement.type']).toBe('SELECT');
            expect(span.tags['topology.vertex']).toEqual(true);
            expect(span.tags['trigger.domainName']).toEqual('API');
            expect(span.tags['trigger.className']).toEqual('AWS-Lambda');
            expect(span.tags['trigger.operationNames']).toEqual(['functionName']);
        });
    });
});

describe('MySQL Integration', () => {
    let tracer;
    let integration;

    beforeAll(() => {
        InvocationSupport.setFunctionName('functionName');
        tracer = new ThundraTracer();
        integration = new MySQLIntegration({
            tracer,
        });
    });

    afterEach(() => {
        tracer.destroy();
    });

    test('should instrument MySQL calls with mysql client', () => {
        const sdk = require('mysql');

        return mysql.selectMySql(sdk).then((data) => {
            const span = tracer.getRecorder().spanList[0];
            
            expect(span.className).toBe('MYSQL');
            expect(span.domainName).toBe('DB');

            expect(span.tags['operation.type']).toBe('READ');
            expect(span.tags['db.instance']).toBe('db');
            expect(span.tags['db.user']).toBe('user');
            expect(span.tags['db.host']).toBe('localhost');
            expect(span.tags['db.port']).toBe(3306);
            expect(span.tags['db.type']).toBe('mysql');
            expect(span.tags['db.statement.type']).toBe('SELECT');
            expect(span.tags['db.statement']).toBe('SELECT 1 + 1 AS solution');
            expect(span.tags['topology.vertex']).toEqual(true);
            expect(span.tags['trigger.domainName']).toEqual('API');
            expect(span.tags['trigger.className']).toEqual('AWS-Lambda');
            expect(span.tags['trigger.operationNames']).toEqual(['functionName']);
        });
    });

    test('should mask MySQL statements with mysql client', () => {
        integration.config.disableInstrumentation = true;
        integration.config.maskRdbStatement = true;

        const sdk = require('mysql');

        return mysql.selectMySql(sdk).then((data) => {
            const span = tracer.getRecorder().spanList[0];

            expect(span.tags['db.statement']).not.toBeTruthy();
            
            expect(span.className).toBe('MYSQL');
            expect(span.domainName).toBe('DB');

            expect(span.tags['operation.type']).toBe('READ');
            expect(span.tags['db.instance']).toBe('db');
            expect(span.tags['db.user']).toBe('user');
            expect(span.tags['db.host']).toBe('localhost');
            expect(span.tags['db.port']).toBe(3306);
            expect(span.tags['db.type']).toBe('mysql');
            expect(span.tags['db.statement.type']).toBe('SELECT'); 
            expect(span.tags['topology.vertex']).toEqual(true);
            expect(span.tags['trigger.domainName']).toEqual('API');
            expect(span.tags['trigger.className']).toEqual('AWS-Lambda');
            expect(span.tags['trigger.operationNames']).toEqual(['functionName']);
        });
    });
});