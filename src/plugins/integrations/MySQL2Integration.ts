import Integration from './Integration';
import ThundraTracer from '../../opentracing/Tracer';
import { DBTags, SpanTags, SpanTypes, DomainNames, ClassNames } from '../../Constants';
import Utils from '../Utils';
import ModuleVersionValidator from './ModuleVersionValidator';
import ThundraLogger from '../../ThundraLogger';

const shimmer = require('shimmer');
const Hook = require('require-in-the-middle');

class MySQL2Integration implements Integration {
  config: any;
  lib: any;
  version: string;
  hook: any;
  basedir: string;

  constructor(tracer: ThundraTracer, config: any) {
    this.version = '^1.5';
    this.hook = Hook('mysql2', { internals: true }, (exp: any, name: string, basedir: string) => {
      if (name === 'mysql2/lib/connection.js') {
        const moduleValidator = new ModuleVersionValidator();
        const isValidVersion = moduleValidator.validateModuleVersion(basedir, this.version);
        if (!isValidVersion) {
          ThundraLogger.getInstance().error(`Invalid module version for mysql2 integration.
                                             Supported version is ${this.version}`);
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
    function wrapper(query: any) {
      return function queryWrapper(sql: any, values: any, cb: any) {
        const parentSpan = tracer.getActiveSpan();

        const span = tracer._startSpan(this.config.database, {
          childOf: parentSpan,
          domainName: DomainNames.DB,
          className: ClassNames.RDB,
        });

        span.addTags({
          [SpanTags.SPAN_TYPE]: SpanTypes.RDB,
          [DBTags.DB_INSTANCE]: this.config.database,
          [DBTags.DB_USER]: this.config.user,
          [DBTags.DB_HOST]: this.config.host,
          [DBTags.DB_PORT]: this.config.port,
        });

        const sequence = query.call(this, sql, values, cb);

        const statement = sequence.sql;

        span.addTags({
          [DBTags.DB_STATEMENT_TYPE]: statement.split(' ')[0],
          [DBTags.DB_STATEMENT]: statement,
        });

        const originalCallback = sequence.onResult;

        const wrappedCallback = (err: any, res: any) => {
          if (err) {
            const parseError = Utils.parseError(err);
            span.setTag('error', true);
            span.setTag('error.kind', parseError.errorType);
            span.setTag('error.message', parseError.errorMessage);
            span.setTag('error.stack', parseError.stack);
            span.setTag('error.code', parseError.code);
          }

          span.finish();

          originalCallback(err, res);
        };

        if (sequence.onResult) {
          sequence.onResult = wrappedCallback;
        } else {
          sequence.on('end', () => {
            span.finish();
          });
        }

        return sequence;
      };
    }

    shimmer.wrap(lib.prototype, 'query', wrapper);
  }

  unwrap() {
    shimmer.unwrap(this.lib.prototype, 'query');
    this.hook.unhook();
  }
}

export default MySQL2Integration;
