
import MySQL2Integration from '../../dist/plugins/integrations/MySQL2Integration';
import MySQLIntegration from '../../dist/plugins/integrations/MySQLIntegration';
import ThundraTracer from '../../dist/opentracing/Tracer';
import InvocationSupport from '../../dist/plugins/support/InvocationSupport';
import mysql from './utils/mysql.integration.utils';
import TraceConfig from '../../dist/plugins/config/TraceConfig';


describe('MySQL2 Integration', () => {
    InvocationSupport.setFunctionName('functionName');

    test('should instrument MySQL calls with mysql2 client', () => {
        const tracer = new ThundraTracer();
        const integration = new MySQL2Integration({
            tracer,
        });
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
        const tracer = new ThundraTracer();
        const integration = new MySQL2Integration({
            disableInstrumentation: true,
            maskRdbStatement: true,
            tracer,
        });
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
    test('should instrument MySQL calls with mysql client', () => {
        const tracer = new ThundraTracer();
        const integration = new MySQLIntegration({
            tracer,
        });
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
        const tracer = new ThundraTracer();
        const integration = new MySQLIntegration({
            disableInstrumentation: true,
            maskRdbStatement: true,
            tracer,
        });
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