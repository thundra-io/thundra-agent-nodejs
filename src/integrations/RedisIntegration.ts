import Integration from './Integration';
import {
    SpanTags, RedisTags, RedisCommandTypes, SpanTypes, DomainNames,
    ClassNames, DBTypes, DBTags } from '../Constants';
import { DB_TYPE, DB_INSTANCE } from 'opentracing/lib/ext/tags';
import ThundraLogger from '../ThundraLogger';
import ThundraSpan from '../opentracing/Span';
import ModuleUtils from '../utils/ModuleUtils';
import ThundraChaosError from '../error/ThundraChaosError';
import ExecutionContextManager from '../context/ExecutionContextManager';

const shimmer = require('shimmer');
const has = require('lodash.has');

const MODULE_NAME = 'redis';
const MODULE_VERSION = '>=2.6';

/**
 * {@link Integration} implementation for Redis integration
 * through {@code redis} library
 */
class RedisIntegration implements Integration {

    config: any;
    private instrumentContext: any;

    constructor(config: any) {
        ThundraLogger.debug('<RedisIntegration> Activating Redis integration');

        this.config = config || {};
        this.instrumentContext = ModuleUtils.instrument(
            [MODULE_NAME], MODULE_VERSION,
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
        ThundraLogger.debug('<RedisIntegration> Wrap');

        function wrapper(internalSendCommand: any) {
            return function internalSendCommandWrapper(options: any) {
                ThundraLogger.debug('<RedisIntegration> Tracing Redis command:', options);

                let span: ThundraSpan;
                try {
                    const { tracer } = ExecutionContextManager.get();

                    if (!tracer) {
                        ThundraLogger.debug('<RedisIntegration> Skipped tracing command as no tracer is available');
                        return internalSendCommand.call(this, options);
                    }

                    if (!options) {
                        ThundraLogger.debug('<RedisIntegration> Skipped tracing command as no options is available');
                        return internalSendCommand.call(this, options);
                    }

                    const me = this;

                    const parentSpan = tracer.getActiveSpan();
                    let host = 'localhost';
                    let port = '6379';
                    let command = '';

                    if (this.connection_options) {
                        host = String(this.connection_options.host);
                        port = String(this.connection_options.port);
                        command = options.command.toUpperCase();
                    }

                    const operationType = RedisCommandTypes[command] ? RedisCommandTypes[command] : '';

                    ThundraLogger.debug(`<RedisIntegration> Starting Redis span with name ${host}`);

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
                            [RedisTags.REDIS_COMMAND]: config.maskRedisCommand ? undefined : command,
                            [RedisTags.REDIS_COMMAND_ARGS]: config.maskRedisCommand ? undefined : options.args.join(','),
                            [RedisTags.REDIS_COMMAND_TYPE]: operationType,
                            [SpanTags.OPERATION_TYPE]: operationType,
                            [SpanTags.TOPOLOGY_VERTEX]: true,
                        },
                    });

                    span._initialized();

                    const originalCallback = options.callback;

                    const wrappedCallback = (err: any, res: any) => {
                        if (err) {
                            span.setErrorTag(err);
                        }
                        ThundraLogger.debug(`<RedisIntegration> Closing Redis span with name ${span.getOperationName()}`);
                        span.closeWithCallback(me, originalCallback, [err, res]);
                    };

                    options.callback = wrappedCallback;

                    return internalSendCommand.call(this, options);
                } catch (error) {
                    ThundraLogger.error('<RedisIntegration> Error occurred while tracing Redis command:', error);

                    if (span) {
                        ThundraLogger.debug(
                            `<RedisIntegration> Because of error, closing Redis span with name ${span.getOperationName()}`);
                        span.close();
                    }

                    if (error instanceof ThundraChaosError) {
                        throw error;
                    } else {
                        internalSendCommand.call(this, options);
                    }
                }
            };
        }

        if (has(lib, 'RedisClient.prototype.internal_send_command')) {
            ThundraLogger.debug('<RedisIntegration> Wrapping "redis.RedisClient.internal_send_command"');

            shimmer.wrap(lib.RedisClient.prototype, 'internal_send_command', wrapper);
        }
    }

    /**
     * Unwraps given library
     * @param lib the library to be unwrapped
     */
    doUnwrap(lib: any) {
        ThundraLogger.debug('<RedisIntegration> Do unwrap');

        ThundraLogger.debug('<RedisIntegration> Unwrapping "redis.RedisClient.internal_send_command"');

        shimmer.unwrap(lib.RedisClient.prototype, 'internal_send_command');
    }

    /**
     * @inheritDoc
     */
    unwrap() {
        ThundraLogger.debug('<RedisIntegration> Unwrap');

        if (this.instrumentContext.uninstrument) {
            this.instrumentContext.uninstrument();
        }
    }

}

export default RedisIntegration;
