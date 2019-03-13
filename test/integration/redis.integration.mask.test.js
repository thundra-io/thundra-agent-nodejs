import RedisIntegration from '../../dist/plugins/integrations/RedisIntegration';
import ThundraTracer from '../../dist/opentracing/Tracer';
import Redis from './utils/redis.integration.utils';
import InvocationSupport from '../../dist/plugins/support/InvocationSupport';
import TraceConfig from '../../dist/plugins/config/TraceConfig';

describe('Redis Integration', () => {
    InvocationSupport.setFunctionName('functionName');

    test('should mask Redis statments ', () => {
        const integration = new RedisIntegration({});
        const sdk = require('redis');

        const traceConfig = new TraceConfig({
            disableInstrumentation: true,
            maskRedisStatement: true,
        });

        integration.wrap(sdk, traceConfig);

        const tracer = new ThundraTracer();
        tracer.getRecorder().spanList = [];

        return Redis.set(sdk).then((data) => {
            const spanList = tracer.getRecorder().spanList;

            let writeCommandSpan;
            spanList.forEach((span) => {
                if (span.tags['redis.command.type'] === 'WRITE') {
                    writeCommandSpan = span;
                }
            });

            expect(spanList.length).toBe(4);

            expect(writeCommandSpan.tags['redis.command']).not.toBeTruthy();
            expect(writeCommandSpan.tags['redis.command.args']).not.toBeTruthy();

            expect(writeCommandSpan.className).toBe('Redis');
            expect(writeCommandSpan.domainName).toBe('Cache');
            expect(writeCommandSpan.tags['operation.type']).toBe('WRITE');
            expect(writeCommandSpan.tags['db.type']).toBe('redis');
            expect(writeCommandSpan.tags['db.instance']).toBe('127.0.0.1');
            expect(writeCommandSpan.tags['db.statement.type']).toBe('WRITE');
            expect(writeCommandSpan.tags['redis.host']).toBe('127.0.0.1');
            expect(writeCommandSpan.tags['redis.port']).toBe('6379');
            expect(writeCommandSpan.tags['redis.command.type']).toBe('WRITE');
            expect(writeCommandSpan.tags['topology.vertex']).toEqual(true);
            expect(writeCommandSpan.tags['trigger.domainName']).toEqual('API');
            expect(writeCommandSpan.tags['trigger.className']).toEqual('AWS-Lambda');
            expect(writeCommandSpan.tags['trigger.operationNames']).toEqual(['functionName']);

        });
    });
});
