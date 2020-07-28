import MySQL2Integration from '../../dist/plugins/integrations/MySQL2Integration';
import MySQLIntegration from '../../dist/plugins/integrations/MySQLIntegration';
import ThundraTracer from '../../dist/opentracing/Tracer';
import mysql from './utils/mysql.integration.utils';
import ExecutionContextManager from '../../dist/context/ExecutionContextManager';
import ExecutionContext from '../../dist/context/ExecutionContext';

describe('MySQL2 integration', () => {
    let tracer;
    let integration;

    beforeAll(() => {
        tracer = new ThundraTracer();
        ExecutionContextManager.set(new ExecutionContext({ tracer }));
        integration = new MySQL2Integration();
    });

    afterEach(() => {
        tracer.destroy();
    });

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
        });
    });
});

describe('MySQL Integration', () => {
    let tracer;
    let integration;

    beforeAll(() => {
        tracer = new ThundraTracer();
        ExecutionContextManager.set(new ExecutionContext({ tracer }));
        integration = new MySQLIntegration();
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
        });
    });
});