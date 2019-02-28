import Integration from './Integration';
import ThundraTracer from '../../opentracing/Tracer';
import {
  DBTags, SpanTags, SpanTypes, DomainNames, DBTypes, SQLQueryOperationTypes,
  LAMBDA_APPLICATION_DOMAIN_NAME, LAMBDA_APPLICATION_CLASS_NAME,
} from '../../Constants';
import ModuleVersionValidator from './ModuleVersionValidator';
import ThundraLogger from '../../ThundraLogger';
import ThundraSpan from '../../opentracing/Span';
import InvocationSupport from '../support/InvocationSupport';

const shimmer = require('shimmer');
const Hook = require('require-in-the-middle');

class MySQLIntegration implements Integration {
  config: any;
  lib: any;
  version: string;
  hook: any;
  basedir: string;

  constructor(config: any) {
    this.version = '>=2';
    this.hook = Hook('mysql', { internals: true }, (exp: any, name: string, basedir: string) => {
      if (name === 'mysql/lib/Connection.js' || name === 'lib/Connection.js') {
        const moduleValidator = new ModuleVersionValidator();
        const isValidVersion = moduleValidator.validateModuleVersion(basedir, this.version);
        if (!isValidVersion) {
          ThundraLogger.getInstance().error(`Invalid module version for mysql integration.
                                             Supported version is ${this.version}`);
        } else {
          this.lib = exp;
          this.config = config;
          this.basedir = basedir;

          this.wrap.call(this, exp, config);
        }
      }
      return exp;
    });
  }

  wrap(lib: any, config: any) {
    function wrapper(query: any) {
      let span: ThundraSpan;

      return function queryWrapper(sql: any, values: any, cb: any) {
        try {
          const tracer = ThundraTracer.getInstance();

          if (!tracer) {
            return query.call(this, sql, values, cb);
          }

          const me = this;
          const functionName = InvocationSupport.getFunctionName();
          const parentSpan = tracer.getActiveSpan();

          span = tracer._startSpan(this.config.database, {
            childOf: parentSpan,
            domainName: DomainNames.DB,
            className: DBTypes.MYSQL.toUpperCase(),
            disableActiveStart: true,
          });

          span.addTags({
            [SpanTags.SPAN_TYPE]: SpanTypes.RDB,
            [DBTags.DB_INSTANCE]: this.config.database,
            [DBTags.DB_USER]: this.config.user,
            [DBTags.DB_HOST]: this.config.host,
            [DBTags.DB_PORT]: this.config.port,
            [DBTags.DB_TYPE]: DBTypes.MYSQL,
            [SpanTags.TOPOLOGY_VERTEX]: true,
            [SpanTags.TRIGGER_DOMAIN_NAME]: LAMBDA_APPLICATION_DOMAIN_NAME,
            [SpanTags.TRIGGER_CLASS_NAME]: LAMBDA_APPLICATION_CLASS_NAME,
            [SpanTags.TRIGGER_OPERATION_NAMES]: [functionName],
          });

          const sequence = query.call(this, sql, values, cb);

          const statement = sequence.sql;

          if (statement) {
            const statementType = statement.split(' ')[0].toUpperCase();
            span.addTags({
              [DBTags.DB_STATEMENT_TYPE]: statementType,
              [DBTags.DB_STATEMENT]: statement,
              [SpanTags.OPERATION_TYPE]: SQLQueryOperationTypes[statementType] ? SQLQueryOperationTypes[statementType] : '',
            });
          }

          const originalCallback = sequence.onResult;

          const wrappedCallback = (err: any, res: any) => {
            if (err) {
              span.setErrorTag(err);
            }

            span.closeWithCallback(me, originalCallback, [err, res]);
          };

          if (sequence.onResult) {
            sequence.onResult = wrappedCallback;
          } else {
            sequence.on('end', () => {
              span.close();
            });
          }

          return sequence;
        } catch (error) {
          if (span) {
            span.close();
          }

          ThundraLogger.getInstance().error(error);
          query.call(this, sql, values, cb);
        }
      };
    }

    shimmer.wrap(lib.prototype, 'query', wrapper);
  }

  unwrap() {
    shimmer.unwrap(this.lib.prototype, 'query');
    this.hook.unhook();
  }
}

export default MySQLIntegration;
