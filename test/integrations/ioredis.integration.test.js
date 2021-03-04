import IORedisIntegration from '../../dist/integrations/IORedisIntegration';
import ThundraTracer from '../../dist/opentracing/Tracer';
import Redis from './utils/redis.integration.utils';
import ExecutionContextManager from '../../dist/context/ExecutionContextManager';
import ExecutionContext from '../../dist/context/ExecutionContext';

const {GenericContainer, Wait} = require("testcontainers");

describe('IORedis integration', () => {
    let tracer;
    let integration;
    let container;
    let redisPort;
    let redisHost;

    beforeAll(async () => {
        container = await new GenericContainer("redis")
            .withExposedPorts(6379)
            .withWaitStrategy(Wait.forLogMessage("Ready to accept connections"))
            .start()
        redisPort = container.getMappedPort(6379);
        redisHost = container.getHost();

        tracer = new ThundraTracer();
        ExecutionContextManager.set(new ExecutionContext({tracer}));
        integration = new IORedisIntegration();
    });

    afterAll(async ()=>{
        await container.stop();
    })

    afterEach(() => {
        tracer.destroy();
    });

    test('should instrument IORedis calls', async () => {
        const sdk = require('ioredis');

        await Redis.set(sdk, container);
        const spanList = tracer.getRecorder().spanList;

        let writeCommandSpan;
        spanList.forEach((span) => {
            if (span.tags['redis.command.type'] === 'WRITE') {
                writeCommandSpan = span;
            }
        });
        expect(spanList.length).toBe(2);

        expect(writeCommandSpan.className).toBe('Redis');
        expect(writeCommandSpan.domainName).toBe('Cache');

        expect(writeCommandSpan.tags['operation.type']).toBe('WRITE');
        expect(writeCommandSpan.tags['db.type']).toBe('redis');
        expect(writeCommandSpan.tags['db.instance']).toBe(redisHost);
        expect(writeCommandSpan.tags['db.statement.type']).toBe('WRITE');
        expect(writeCommandSpan.tags['redis.host']).toBe(redisHost);
        expect(writeCommandSpan.tags['redis.port']).toBe(redisPort);
        expect(writeCommandSpan.tags['redis.command']).toBe('SET');
        expect(writeCommandSpan.tags['redis.command.type']).toBe('WRITE');
        expect(writeCommandSpan.tags['redis.command.args']).toBe('string key,string val');
        expect(writeCommandSpan.tags['topology.vertex']).toEqual(true);

    });
});
