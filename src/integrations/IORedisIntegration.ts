import Integration from './Integration';
import ThundraSpan from '../opentracing/Span';
import { DB_TYPE, DB_INSTANCE } from 'opentracing/lib/ext/tags';
import ThundraLogger from '../ThundraLogger';
import ModuleUtils from '../utils/ModuleUtils';
import {
    DomainNames, ClassNames, SpanTags, SpanTypes, DBTypes, DBTags, RedisTags, RedisCommandTypes, INTEGRATIONS,
} from '../Constants';
import ThundraChaosError from '../error/ThundraChaosError';
import ExecutionContextManager from '../context/ExecutionContextManager';

const shimmer = require('shimmer');
const has = require('lodash.has');
const get = require('lodash.get');

const INTEGRATION_NAME = 'ioredis';

/**
 * {@link Integration} implementation for Redis integration
 * through {@code ioredis} library
 */
class IORedisIntegration implements Integration {

    config: any;
    private instrumentContext: any;

    constructor(config: any) {
        ThundraLogger.debug('<IORedisIntegration> Activating IORedis integration');

        this.config = config || {};
        const ioRedisIntegration = INTEGRATIONS[INTEGRATION_NAME];
        this.instrumentContext = ModuleUtils.instrument(
            ioRedisIntegration.moduleNames, ioRedisIntegration.moduleVersion,
            (lib: any, cfg: any) => {
                this.wrap.call(this, lib, cfg);
            },
            (lib: any, cfg: any) => {
                this.doUnwrap.call(this, lib);
            },
            this.config);
    }

    /**
     * @inheritDoc
     */
    wrap(lib: any, config: any) {
        ThundraLogger.debug('<IORedisIntegration> Wrap');

        const plugin = this;
        function wrapper(original: Function) {
            return function internalSendCommandWrapper(command: any) {
                ThundraLogger.debug('<IORedisIntegration> Tracing Redis command:', command);

                let span: ThundraSpan;
                try {
                    const { tracer } = ExecutionContextManager.get();

                    if (!tracer) {
                        ThundraLogger.debug('<IORedisIntegration> Skipped tracing command as no tracer is available');
                        return original.call(this, command);
                    }

                    if (!command) {
                        ThundraLogger.debug('<IORedisIntegration> Skipped tracing command as no command is available');
                        return original.call(this, command);
                    }

                    if (this.status !== 'ready') {
                        ThundraLogger.debug('<IORedisIntegration> Skipped tracing command as status is not ready');
                        return original.call(this, command);
                    }

                    const parentSpan = tracer.getActiveSpan();
                    const host: string = get(this.options, 'host', 'localhost');
                    const port: string = get(this.options, 'port', '6379');
                    const commandName: string = get(command, 'name', '').toUpperCase();
                    const operationType = get(RedisCommandTypes, commandName, '');

                    ThundraLogger.debug(`<IORedisIntegration> Starting Redis span with name ${host}`);

                    span = tracer._startSpan(host, {
                        childOf: parentSpan,
                        domainName: DomainNames.CACHE,
                        className: ClassNames.REDIS,
                        disableActiveStart: true,
                        tags: {
                            [SpanTags.SPAN_TYPE]: SpanTypes.REDIS,
                            [DB_TYPE]: DBTypes.REDIS,
                            [DB_INSTANCE]: host,
                            [DBTags.DB_STATEMENT_TYPE]: operationType,
                            [RedisTags.REDIS_HOST]: host,
                            [RedisTags.REDIS_PORT]: port,
                            [RedisTags.REDIS_COMMAND]: config.maskRedisCommand ? undefined : commandName,
                            [RedisTags.REDIS_COMMAND_ARGS]: config.maskRedisCommand ? undefined : command.args.join(','),
                            [RedisTags.REDIS_COMMAND_TYPE]: operationType,
                            [SpanTags.OPERATION_TYPE]: operationType,
                            [SpanTags.TOPOLOGY_VERTEX]: true,
                        },
                    });

                    span._initialized();

                    if (typeof command.callback === 'function') {
                        command.callback = plugin.patchEnd(span, command.callback);
                    }
                    if (typeof command.promise === 'object') {
                        if (typeof command.promise.finally === 'function') {
                            command.promise.finally(plugin.patchEnd(span));
                        } else if (typeof command.promise.then === 'function') {
                            command.promise
                                .then(plugin.patchEnd(span))
                                .catch(plugin.patchEnd(span));
                        }
                    }

                    return original.call(this, command);
                } catch (error) {
                    ThundraLogger.error('<IORedisIntegration> Error occurred while tracing Redis command:', error);

                    if (span) {
                        ThundraLogger.debug(
                            `<IORedisIntegration> Because of error, closing Redis span with name ${span.getOperationName()}`);
                        span.close();
                    }

                    if (error instanceof ThundraChaosError) {
                        throw error;
                    } else {
                        return original.call(this, command);
                    }
                }
            };
        }

        if (has(lib, 'prototype.sendCommand')) {
            ThundraLogger.debug('<IORedisIntegration> Wrapping "ioredis.sendCommand"');

            shimmer.wrap(lib.prototype, 'sendCommand', wrapper);
        }
    }

    /**
     * Unwraps given library
     * @param lib the library to be unwrapped
     */
    doUnwrap(lib: any) {
        ThundraLogger.debug('<IORedisIntegration> Do unwrap');

        ThundraLogger.debug('<IORedisIntegration> Unwrapping "ioredis.sendCommand"');

        shimmer.unwrap(lib.prototype, 'sendCommand');
    }

    /**
     * @inheritDoc
     */
    unwrap() {
        ThundraLogger.debug('<IORedisIntegration> Unwrap');

        if (this.instrumentContext.uninstrument) {
            this.instrumentContext.uninstrument();
        }
    }

    private patchEnd(span: ThundraSpan, resultHandler?: Function): () => Promise<{}> {
        return function (this: any, err?: Error) {
            if (err instanceof Error) {
                span.setErrorTag(err);
            }
            ThundraLogger.debug(`<IORedisIntegration> Closing Redis span with name ${span.getOperationName()}`);

            span.close();
            if (typeof resultHandler === 'function') {
                return resultHandler.apply(this, arguments);
            }
        };
    }

}

export default IORedisIntegration;
