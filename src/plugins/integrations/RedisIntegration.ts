import Integration from './Integration';
import {
    SpanTags, RedisTags, RedisCommandTypes, SpanTypes, DomainNames,
    ClassNames, DBTypes, DBTags, LAMBDA_APPLICATION_DOMAIN_NAME, LAMBDA_APPLICATION_CLASS_NAME,
} from '../../Constants';
import { DB_TYPE, DB_INSTANCE } from 'opentracing/lib/ext/tags';
import ThundraLogger from '../../ThundraLogger';
import ThundraSpan from '../../opentracing/Span';
import InvocationSupport from '../support/InvocationSupport';
import Utils from '../utils/Utils';
import ThundraChaosError from '../error/ThundraChaosError';
import * as contextManager from '../../context/contextManager';

const shimmer = require('shimmer');
const has = require('lodash.has');

const MODULE_NAME = 'redis';
const MODULE_VERSION = '>=2.6';

class RedisIntegration implements Integration {
    config: any;
    instrumentContext: any;

    constructor(config: any) {
        this.config = config;
        this.instrumentContext = Utils.instrument(
            [MODULE_NAME], MODULE_VERSION,
            (lib: any, cfg: any) => {
                this.wrap.call(this, lib, cfg);
            },
            (lib: any, cfg: any) => {
                this.doUnwrap.call(this, lib);
            },
            config);
    }

    wrap(lib: any, config: any) {
        const integration = this;
        function wrapper(internalSendCommand: any) {
            return function internalSendCommandWrapper(options: any) {
                let span: ThundraSpan;
                try {
                    const { tracer } = contextManager.get();

                    if (!tracer) {
                        return internalSendCommand.call(this, options);
                    }

                    if (!options) {
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
                            [SpanTags.TRIGGER_DOMAIN_NAME]: LAMBDA_APPLICATION_DOMAIN_NAME,
                            [SpanTags.TRIGGER_CLASS_NAME]: LAMBDA_APPLICATION_CLASS_NAME,
                        },
                    });

                    span._initialized();

                    const originalCallback = options.callback;

                    const wrappedCallback = (err: any, res: any) => {
                        if (err) {
                            span.setErrorTag(err);
                        }

                        span.closeWithCallback(me, originalCallback, [err, res]);
                    };

                    options.callback = wrappedCallback;

                    return internalSendCommand.call(this, options);
                } catch (error) {
                    if (span) {
                        span.close();
                    }

                    if (error instanceof ThundraChaosError) {
                        throw error;
                    } else {
                        ThundraLogger.error(error);
                        internalSendCommand.call(this, options);
                    }
                }
            };
        }

        if (has(lib, 'RedisClient.prototype.internal_send_command')) {
            shimmer.wrap(lib.RedisClient.prototype, 'internal_send_command', wrapper);
        }
    }

    doUnwrap(lib: any) {
        shimmer.unwrap(lib.RedisClient.prototype, 'internal_send_command');
    }

    unwrap() {
        if (this.instrumentContext.uninstrument) {
            this.instrumentContext.uninstrument();
        }
    }
}

export default RedisIntegration;
