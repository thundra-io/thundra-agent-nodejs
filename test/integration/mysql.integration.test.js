
import MySQLIntegration from '../../dist/plugins/integrations/MySQL2Integration';
import ThundraTracer from '../../dist/opentracing/Tracer';
import mysql from './utils/mysql.integration.utils';


describe('MySQL2 Integration', () => {
    test('should instrument MySQL calls ', () => {
        const integration = new MySQLIntegration({});
        const sdk = require('mysql2');
        const connection = require('mysql2/lib/connection.js');
        integration.wrap(connection, {});

        const tracer = new ThundraTracer();

        return mysql.select(sdk).then((data) => {
            const span = tracer.getRecorder().spanList[0];
            expect(span.className).toBe('RDB');
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
            expect(span.tags['trigger.operationNames']).toEqual(['localhost']);
        });
    });
});