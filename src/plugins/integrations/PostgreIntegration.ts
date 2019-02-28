import Integration from './Integration';
import ThundraTracer from '../../opentracing/Tracer';
import {
  DBTags, SpanTags, SpanTypes, DomainNames, ClassNames, DBTypes,
  SQLQueryOperationTypes, LAMBDA_APPLICATION_DOMAIN_NAME, LAMBDA_APPLICATION_CLASS_NAME,
} from '../../Constants';
import Utils from '../utils/Utils';
import ModuleVersionValidator from './ModuleVersionValidator';
import ThundraLogger from '../../ThundraLogger';
import ThundraSpan from '../../opentracing/Span';
import InvocationSupport from '../support/InvocationSupport';

const shimmer = require('shimmer');
const Hook = require('require-in-the-middle');

class PostgreIntegration implements Integration {
  config: any;
  lib: any;
  version: string;
  hook: any;
  basedir: string;

  constructor(config: any) {
    this.version = '6.x';

    this.hook = Hook('pg', { internals: true }, (exp: any, name: string, basedir: string) => {
      if (name === 'pg') {
        const moduleValidator = new ModuleVersionValidator();
        const isValidVersion = moduleValidator.validateModuleVersion(basedir, this.version);

        if (!isValidVersion) {
          ThundraLogger.getInstance().error(`Invalid module version. for pg integration. Supported version is ${this.version}`);
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
    function wrapper(query: any, args: any) {
      return function queryWrapper() {
        let span: ThundraSpan;
        try {
          const tracer = ThundraTracer.getInstance();

          if (!tracer) {
            return query.apply(this, arguments);
          }

          const functionName = InvocationSupport.getFunctionName();
          const parentSpan = tracer.getActiveSpan();

          const params = this.connectionParameters;
          const me = this;

          span = tracer._startSpan(params.database, {
            childOf: parentSpan,
            domainName: DomainNames.DB,
            className: DBTypes.PG.toUpperCase(),
            disableActiveStart: true,
            me,
            callback: arguments[2],
            args: [],
          });

          if (params) {
            span.addTags({
              [SpanTags.SPAN_TYPE]: SpanTypes.RDB,
              [DBTags.DB_INSTANCE]: params.database,
              [DBTags.DB_USER]: params.user,
              [DBTags.DB_HOST]: params.host,
              [DBTags.DB_PORT]: params.port,
              [DBTags.DB_TYPE]: DBTypes.PG,
              [SpanTags.TOPOLOGY_VERTEX]: true,
              [SpanTags.TRIGGER_DOMAIN_NAME]: LAMBDA_APPLICATION_DOMAIN_NAME,
              [SpanTags.TRIGGER_CLASS_NAME]: LAMBDA_APPLICATION_CLASS_NAME,
              [SpanTags.TRIGGER_OPERATION_NAMES]: [functionName],
            });
          }

          const pgQuery = query.apply(this, arguments);

          let statement = pgQuery.text;
          statement = Utils.replaceArgs(statement, pgQuery.values);

          if (statement) {
            const statementType = statement.split(' ')[0].toUpperCase();
            span.addTags({
              [DBTags.DB_STATEMENT_TYPE]: statementType,
              [DBTags.DB_STATEMENT]: statement,
              [SpanTags.OPERATION_TYPE]: SQLQueryOperationTypes[statementType] ? SQLQueryOperationTypes[statementType] : '',
            });
          }

          const originalCallback = pgQuery.callback;

          pgQuery.callback = (err: any, res: any) => {
            if (err) {
              span.setErrorTag(err);
            }

            span.closeWithCallback(me, originalCallback, [err, res]);
          };

          return pgQuery;
        } catch (error) {
          if (span) {
            span.close();
          }

          ThundraLogger.getInstance().error(error);
          query.apply(this, arguments);
        }
      };
    }

    shimmer.wrap(lib.Client.prototype, 'query', wrapper);
  }

  unwrap() {
    shimmer.unwrap(this.lib.Client.prototype, 'query');
    this.hook.unhook();
  }
}

export default PostgreIntegration;
