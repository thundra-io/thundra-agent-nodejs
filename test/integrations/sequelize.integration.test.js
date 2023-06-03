import SequelizeIntegration from '../../dist/integrations/SequelizeIntegration';
import ThundraTracer from '../../dist/opentracing/Tracer';
import ExecutionContextManager from '../../dist/context/ExecutionContextManager';
import ExecutionContext from '../../dist/context/ExecutionContext';
import { DataTypes, Sequelize } from 'sequelize';
import { DBTags, DomainNames, SpanTags } from '../../dist/Constants';

const SQLITE_CONFIG = {
    dialect: 'sqlite',
    storage: 'test.db',
    database: 'test',
    username: 'sa',
    password: '1234',
    logging: false,
};

describe('Sequelize integration', () => {

    let tracer;
    let integration;
    let sequelize;
    let User;

    beforeAll(async () => {
        tracer = new ThundraTracer();
        ExecutionContextManager.set(new ExecutionContext({ tracer }));
        ExecutionContextManager.init();
        integration = new SequelizeIntegration();

        const {
            Sequelize,
            DataTypes
        } = require('sequelize');

        sequelize = new Sequelize(
            SQLITE_CONFIG.database,
            SQLITE_CONFIG.username,
            SQLITE_CONFIG.password,
            SQLITE_CONFIG);
        User = sequelize.define('User', {
            username: DataTypes.STRING,
            birthday: DataTypes.DATE,
        });

        // Automatically create all tables
        await sequelize.sync();
    });

    beforeEach(async () => {
        await User.destroy({ truncate: true });

        await User.create({
            username: 'janedoe',
            birthday: new Date(1980, 6, 20),
        });

        tracer.reset();
    });

    afterEach(async () => {
        await User.destroy({ truncate: true });

        tracer.reset();
    });

    test('should instrument Sequelize calls', async () => {
        integration.config.disableInstrumentation = false;
        integration.config.maskRdbStatement = false;

        await User.findAll();

        const span = tracer.getRecorder().spanList[0];

        expect(span.className).toBe('SQLITE');
        expect(span.domainName).toBe(DomainNames.DB);

        expect(span.tags[SpanTags.OPERATION_TYPE]).toBe('READ');
        expect(span.tags[SpanTags.TOPOLOGY_VERTEX]).toEqual(true);
        expect(span.tags[DBTags.DB_INSTANCE]).toBe('test');
        expect(span.tags[DBTags.DB_USER]).toBe('sa');
        expect(span.tags[DBTags.DB_HOST]).toBe('localhost');
        expect(span.tags[DBTags.DB_PORT]).toBe(undefined);
        expect(span.tags[DBTags.DB_TYPE]).toBe('sqlite');
        expect(span.tags[DBTags.DB_STATEMENT]).toBe('SELECT `id`, `username`, `birthday`, `createdAt`, `updatedAt` FROM `Users` AS `User`;');
        expect(span.tags[DBTags.DB_STATEMENT_TYPE]).toBe('SELECT');
        expect(span.tags[DBTags.DB_RESULT_COUNT]).toBe(1);
    });

    test('should mask Sequelize statements', async () => {
        integration.config.disableInstrumentation = true;
        integration.config.maskRdbStatement = true;

        await User.findAll();

        const span = tracer.getRecorder().spanList[0];

        expect(span.className).toBe('SQLITE');
        expect(span.domainName).toBe(DomainNames.DB);

        expect(span.tags[SpanTags.OPERATION_TYPE]).toBe('READ');
        expect(span.tags[SpanTags.TOPOLOGY_VERTEX]).toEqual(true);
        expect(span.tags[DBTags.DB_INSTANCE]).toBe('test');
        expect(span.tags[DBTags.DB_USER]).toBe('sa');
        expect(span.tags[DBTags.DB_HOST]).toBe('localhost');
        expect(span.tags[DBTags.DB_PORT]).toBe(undefined);
        expect(span.tags[DBTags.DB_TYPE]).toBe('sqlite');
        expect(span.tags[DBTags.DB_STATEMENT]).toBe(undefined);
        expect(span.tags[DBTags.DB_STATEMENT_TYPE]).toBe('SELECT');
        expect(span.tags[DBTags.DB_RESULT_COUNT]).toBe(1);
    });

});
