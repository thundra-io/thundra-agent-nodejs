import PostgreIntegration from '../../dist/integrations/PostgreIntegration';
import ThundraTracer from '../../dist/opentracing/Tracer';
import PG from './utils/pg.integration.utils';
import ExecutionContextManager from '../../dist/context/ExecutionContextManager';
import ExecutionContext from '../../dist/context/ExecutionContext';

describe('PostgreSQL integration', () => {
    let tracer;
    let integration;

    beforeAll(() => {
        tracer = new ThundraTracer();
        ExecutionContextManager.set(new ExecutionContext({ tracer }));
        integration = new PostgreIntegration();
    });

    afterEach(() => {
        tracer.destroy();
    });

    test('should instrument PostgreSQL calls ', () => {
        const sdk = require('pg');

        return PG.select(sdk).then((data) => {
            const span = tracer.getRecorder().spanList[0];

            expect(span.className).toBe('POSTGRESQL');
            expect(span.domainName).toBe('DB');

            expect(span.tags['operation.type']).toBe('READ');
            expect(span.tags['db.instance']).toBe('postgres');
            expect(span.tags['db.user']).toBe('postgres');
            expect(span.tags['db.host']).toBe('localhost');
            expect(span.tags['db.port']).toBe(5432);
            expect(span.tags['db.type']).toBe('postgresql');
            expect(span.tags['db.statement']).toBe('SELECT Hello world!::text as message');
            expect(span.tags['topology.vertex']).toEqual(true);
        });
    });

    test('sequelize', async () => {
        const { Sequelize } = require('sequelize');
        const sequelize = new Sequelize('postgres://postgres:postgres@localhost:5432/postgres');

        await sequelize.query('SELECT 1+1 AS result');
        await sequelize.close();
        
        const spanList = tracer.getRecorder().spanList;
        const span = spanList[3];
        
        expect(span.tags['db.statement']).toBe('SELECT 1+1 AS result');
        expect(span.className).toBe('POSTGRESQL');
        expect(span.domainName).toBe('DB');
        expect(span.tags['operation.type']).toBe('READ');
        expect(span.tags['db.instance']).toBe('postgres');
        expect(span.tags['db.user']).toBe('postgres');
        expect(span.tags['db.host']).toBe('localhost');
        expect(span.tags['db.port']).toBe(5432);
        expect(span.tags['db.type']).toBe('postgresql');
        expect(span.tags['topology.vertex']).toEqual(true);
    });

    test('should mask PostgreSQL statements', () => {
        integration.config.disableInstrumentation = true;
        integration.config.maskRdbStatement = true;
        const sdk = require('pg');

        return PG.select(sdk).then((data) => {
            const span = tracer.getRecorder().spanList[0];

            expect(span.tags['db.statement']).not.toBeTruthy();

            expect(span.className).toBe('POSTGRESQL');
            expect(span.domainName).toBe('DB');
            expect(span.tags['operation.type']).toBe('READ');
            expect(span.tags['db.instance']).toBe('postgres');
            expect(span.tags['db.user']).toBe('postgres');
            expect(span.tags['db.host']).toBe('localhost');
            expect(span.tags['db.port']).toBe(5432);
            expect(span.tags['db.type']).toBe('postgresql');
            expect(span.tags['topology.vertex']).toEqual(true);
        });
    });
});
