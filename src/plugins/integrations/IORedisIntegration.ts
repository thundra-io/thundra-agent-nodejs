import Integration from './Integration';
import ThundraTracer from '../../opentracing/Tracer';
import ThundraSpan from '../../opentracing/Span';
import InvocationSupport from '../support/InvocationSupport';
import {
    DomainNames, ClassNames, SpanTags, SpanTypes, DBTypes, DBTags, RedisTags,
    LAMBDA_APPLICATION_CLASS_NAME, LAMBDA_APPLICATION_DOMAIN_NAME, RedisCommandTypes,
} from '../../Constants';
import { DB_TYPE, DB_INSTANCE } from 'opentracing/lib/ext/tags';

const shimmer = require('shimmer');
const Hook = require('require-in-the-middle');
const get = require('lodash.get');

class IORedisIntegration implements Integration {
    version: string;
    lib: any;
    config: any;
    hook: any;
    basedir: string;

    constructor(config: any) {
        this.hook = Hook('ioredis', { internals: true }, (exp: any, name: string, basedir: string) => {
            if (name !== 'ioredis') {
                return exp;
            }

            this.lib = exp;
            this.config = config;
            this.basedir = basedir;

            this.wrap.call(this, exp, config);

            return exp;
        });
    }

    wrap(lib: any, config: any) {
        function wrapper(original: Function) {
            return function internalSendCommandWrapper(command: any) {
                let span: ThundraSpan;
                try {
                    const tracer = ThundraTracer.getInstance();

                    if (!tracer || !command) {
                        return original.call(this, command);
                    }

                    const me = this;
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

                    return original.call(this, command);
                } catch (error) {
                    // pass
                }
            };
        }

        shimmer.wrap(lib.prototype, 'sendCommand', wrapper);
    }

    unwrap() {
        console.log('IOREDIS UNWRAP METHOD');
    }
}

export default IORedisIntegration;
