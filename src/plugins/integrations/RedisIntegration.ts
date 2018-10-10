import Integration from './Integration';
import ThundraTracer from '../../opentracing/Tracer';
import { SpanTags, RedisTags, RedisCommandTypes, SpanTypes, DomainNames, ClassNames, DBTypes, DBTags } from '../../Constants';
import Utils from '../Utils';
import { DB_TYPE, DB_INSTANCE } from 'opentracing/lib/ext/tags';
import ModuleVersionValidator from './ModuleVersionValidator';
import ThundraLogger from '../../ThundraLogger';

const shimmer = require('shimmer');
const Hook = require('require-in-the-middle');

class RedisIntegration implements Integration {
  version: string;
  lib: any;
  config: any;
  hook: any;
  basedir: string;

  constructor(tracer: ThundraTracer, config: any) {
    this.version = '^2.6';
    this.hook = Hook('redis', { internals: true }, (exp: any, name: string, basedir: string) => {
      if (name === 'redis') {
        const moduleValidator = new ModuleVersionValidator();
        const isValidVersion = moduleValidator.validateModuleVersion(basedir, this.version);
        if (!isValidVersion) {
          ThundraLogger.getInstance().error(`Invalid module version for redis integration. Supported version is ${this.version}`);
        } else {
          this.lib = exp;
          this.config = config;
          this.basedir = basedir;

          this.wrap.call(this, exp, tracer, config);
        }
      }
      return exp;
    });
  }

  wrap(lib: any, tracer: ThundraTracer, config: any) {

    function wrapper(internalSendCommand: any) {
      return function internalSendCommandWrapper(options: any) {
        if (!options) {
          return internalSendCommand.call(this, options);
        }

        const parentSpan = tracer.getActiveSpan();
        let host = 'localhost';
        let port = '6379';
        let command = '';

        if (this.connection_options) {
          host = String(this.connection_options.host);
          port = String(this.connection_options.port);
          command = options.command.toUpperCase();
        }

        const operationType = RedisCommandTypes[command] ? RedisCommandTypes[command] : 'READ';

        const span = tracer._startSpan(host, {
          childOf: parentSpan,
          domainName: DomainNames.CACHE,
          className: ClassNames.REDIS,
          tags: {
            [SpanTags.SPAN_TYPE]: SpanTypes.REDIS,
            [DB_TYPE]: DBTypes.REDIS,
            [DB_INSTANCE]: host,
            [DBTags.DB_STATEMENT_TYPE]: operationType,
            [RedisTags.REDIS_HOST]: host,
            [RedisTags.REDIS_PORT]: port,
            [RedisTags.REDIS_COMMAND]: command,
            [RedisTags.REDIS_COMMAND_TYPE]: operationType,
            [RedisTags.REDIS_COMMAND_ARGS]: options.args.join(','),
          },
        });

        const originalCallback = options.callback;

        const wrappedCallback = (err: any, res: any) => {
          if (err) {
            const parseError = Utils.parseError(err);
            span.setTag('error', true);
            span.setTag('error.kind', parseError.errorType);
            span.setTag('error.message', parseError.errorMessage);
          }

          span.finish();

          originalCallback(err, res);
        };

        options.callback = wrappedCallback;

        return internalSendCommand.call(this, options);
      };
    }

    shimmer.wrap(lib.RedisClient.prototype, 'internal_send_command', wrapper);
  }

  unwrap() {
    shimmer.unwrap(this.lib.RedisClient.prototype, 'internal_send_command');
    this.hook.unhook();
  }
}

export default RedisIntegration;
