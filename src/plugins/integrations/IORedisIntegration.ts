import Integration from './Integration';
import ThundraSpan from '../../opentracing/Span';
import InvocationSupport from '../support/InvocationSupport';
import { DB_TYPE, DB_INSTANCE } from 'opentracing/lib/ext/tags';
import ThundraLogger from '../../ThundraLogger';
import Utils from '../utils/Utils';
import ModuleVersionValidator from './ModuleVersionValidator';
import {
    DomainNames, ClassNames, SpanTags, SpanTypes, DBTypes, DBTags, RedisTags,
    LAMBDA_APPLICATION_CLASS_NAME, LAMBDA_APPLICATION_DOMAIN_NAME, RedisCommandTypes,
} from '../../Constants';

const shimmer = require('shimmer');
const has = require('lodash.has');
const get = require('lodash.get');

const moduleName = 'ioredis';

class IORedisIntegration implements Integration {
    version: string;
    lib: any;
    config: any;
    basedir: string;
    wrapped: boolean;

    constructor(config: any) {
        this.wrapped = false;
        this.version = '>=2';
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
        const plugin = this;
        function wrapper(original: Function) {
            return function internalSendCommandWrapper(command: any) {
                let span: ThundraSpan;
                try {
                    const tracer = plugin.config.tracer;

                    if (!tracer || !command || this.status !== 'ready') {
                        return original.call(this, command);
                    }

                    const functionName = InvocationSupport.getFunctionName();
                    const parentSpan = tracer.getActiveSpan();
                    const host: string = get(this.options, 'host', 'localhost');
                    const port: string = get(this.options, 'port', '6379');
                    const commandName: string = get(command, 'name', '').toUpperCase();
                    const operationType = get(RedisCommandTypes, commandName, '');

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
                            [RedisTags.REDIS_COMMAND]: config.maskRedisStatement ? undefined : commandName,
                            [RedisTags.REDIS_COMMAND_ARGS]: config.maskRedisStatement ? undefined : command.args.join(','),
                            [RedisTags.REDIS_COMMAND_TYPE]: operationType,
                            [SpanTags.OPERATION_TYPE]: operationType,
                            [SpanTags.TOPOLOGY_VERTEX]: true,
                            [SpanTags.TRIGGER_DOMAIN_NAME]: LAMBDA_APPLICATION_DOMAIN_NAME,
                            [SpanTags.TRIGGER_CLASS_NAME]: LAMBDA_APPLICATION_CLASS_NAME,
                            [SpanTags.TRIGGER_OPERATION_NAMES]: [functionName],
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
                            command.promise.then(plugin.patchEnd(span))
                                .catch(plugin.patchEnd(span));
                        }
                    }

                    return original.call(this, command);
                } catch (error) {
                    if (span) {
                        span.close();
                    }

                    ThundraLogger.getInstance().error(error);
                    return original.call(this, command);
                }
            };
        }

        if (this.wrapped) {
            this.unwrap();
        }

        if (has(lib, 'prototype.sendCommand')) {
            shimmer.wrap(lib.prototype, 'sendCommand', wrapper);
            this.wrapped = true;
        }
    }

    unwrap() {
        shimmer.unwrap(this.lib.prototype, 'sendCommand');
        this.wrapped = false;
    }

    patchEnd(span: ThundraSpan, resultHandler?: Function): () => Promise<{}> {
        return function (this: any, err?: Error) {
            if (err instanceof Error) {
                span.setErrorTag(err);
            }
            span.close();
            if (typeof resultHandler === 'function') {
                return resultHandler.apply(this, arguments);
            }
        };
    }
}

export default IORedisIntegration;
