import RedisIntegration from '../../dist/plugins/integrations/RedisIntegration';
import ThundraTracer from '../../dist/opentracing/Tracer';
import Redis from './utils/redis.integration.utils';

describe('Redis Integration', () => {
    test('should instrument Redis calls ', () => {
        const integration = new RedisIntegration({});
        const sdk = require('redis');

        integration.wrap(sdk, {});

        const tracer = new ThundraTracer();

        return Redis.set(sdk).then((data) => {
            const spanList = tracer.getRecorder().spanList;

            let writeCommandSpan;
            spanList.forEach((span) => {
                if (span.tags['redis.command.type'] === 'WRITE') {
                    writeCommandSpan = span;
                }
            });

            expect(spanList.length).toBe(3);

            expect(writeCommandSpan.className).toBe('Redis');
            expect(writeCommandSpan.domainName).toBe('Cache');

            expect(writeCommandSpan.tags['db.type']).toBe('redis');
            expect(writeCommandSpan.tags['db.instance']).toBe('127.0.0.1');
            expect(writeCommandSpan.tags['db.statement.type']).toBe('WRITE');
            expect(writeCommandSpan.tags['redis.host']).toBe('127.0.0.1');
            expect(writeCommandSpan.tags['redis.port']).toBe('6379');
            expect(writeCommandSpan.tags['redis.command']).toBe('SET');
            expect(writeCommandSpan.tags['redis.command.type']).toBe('WRITE');
            expect(writeCommandSpan.tags['redis.command.args']).toBe('string key,string val');
        
        });
    });
});