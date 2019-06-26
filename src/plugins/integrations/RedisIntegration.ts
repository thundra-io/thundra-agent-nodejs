import Integration from './Integration';
import ThundraTracer from '../../opentracing/Tracer';
import {
    SpanTags, RedisTags, RedisCommandTypes, SpanTypes, DomainNames,
    ClassNames, DBTypes, DBTags, LAMBDA_APPLICATION_DOMAIN_NAME, LAMBDA_APPLICATION_CLASS_NAME,
} from '../../Constants';
import { DB_TYPE, DB_INSTANCE } from 'opentracing/lib/ext/tags';
import ModuleVersionValidator from './ModuleVersionValidator';
import ThundraLogger from '../../ThundraLogger';
import ThundraSpan from '../../opentracing/Span';
import InvocationSupport from '../support/InvocationSupport';
import Utils from '../utils/Utils';

const shimmer = require('shimmer');
const has = require('lodash.has');

const moduleName = 'redis';

class RedisIntegration implements Integration {
    version: string;
    lib: any;
    config: any;
    basedir: string;
    wrapped: boolean;

    constructor(config: any) {
        this.wrapped = false;
        this.version = '^2.6';
        this.lib = Utils.tryRequire(moduleName);

        if (this.lib) {
            const { basedir } = Utils.getModuleInfo(moduleName);
            if (!basedir) {
                ThundraLogger.getInstance().error(`Base directory is not found for the package ${moduleName}`);
                return;
            }
            const moduleValidator = new ModuleVersionValidator();
            const isValidVersion = moduleValidator.validateModuleVersion(basedir, this.version);
            if (!isValidVersion) {
                ThundraLogger.getInstance().error(`Invalid module version for ${moduleName} integration.
                                            Supported version is ${this.version}`);
                return;
            } else {
                this.config = config;
                this.basedir = basedir;
                this.wrap.call(this, this.lib, config);
            }
        }
    }

    wrap(lib: any, config: any) {
        function wrapper(internalSendCommand: any) {
            return function internalSendCommandWrapper(options: any) {
                let span: ThundraSpan;
                try {
                    const tracer = ThundraTracer.getInstance();

                    if (!tracer) {
                        return internalSendCommand.call(this, options);
                    }

                    if (!options) {
                        return internalSendCommand.call(this, options);
                    }

                    const me = this;

                    const functionName = InvocationSupport.getFunctionName();

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
                            [RedisTags.REDIS_COMMAND]: config.maskRedisStatement ? undefined : command,
                            [RedisTags.REDIS_COMMAND_ARGS]: config.maskRedisStatement ? undefined : options.args.join(','),
                            [RedisTags.REDIS_COMMAND_TYPE]: operationType,
                            [SpanTags.OPERATION_TYPE]: operationType,
                            [SpanTags.TOPOLOGY_VERTEX]: true,
                            [SpanTags.TRIGGER_DOMAIN_NAME]: LAMBDA_APPLICATION_DOMAIN_NAME,
                            [SpanTags.TRIGGER_CLASS_NAME]: LAMBDA_APPLICATION_CLASS_NAME,
                            [SpanTags.TRIGGER_OPERATION_NAMES]: [functionName],
                        },
                    });

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

                    ThundraLogger.getInstance().error(error);
                    internalSendCommand.call(this, options);
                }
            };
        }
        if (this.wrapped) {
            this.unwrap();
        }

        if (has(lib, 'RedisClient.prototype.internal_send_command')) {
            shimmer.wrap(lib.RedisClient.prototype, 'internal_send_command', wrapper);
            this.wrapped = true;
        }
    }

    unwrap() {
        shimmer.unwrap(this.lib.RedisClient.prototype, 'internal_send_command');
        this.wrapped = false;
    }
}

export default RedisIntegration;
