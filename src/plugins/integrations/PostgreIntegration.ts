import Integration from './Integration';
import ThundraTracer from '../../opentracing/Tracer';
import { DBTags, SpanTags, SpanTypes, DomainNames, ClassNames, DBTypes,
  SQLQueryOperationTypes, LAMBDA_APPLICATION_DOMAIN_NAME, LAMBDA_APPLICATION_CLASS_NAME } from '../../Constants';
import Utils from '../utils/Utils';
import ModuleVersionValidator from './ModuleVersionValidator';
import ThundraLogger from '../../ThundraLogger';

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

        const tracer = ThundraTracer.getInstance();
        const parentSpan = tracer.getActiveSpan();

        const params = this.connectionParameters;
        const span = tracer._startSpan(params.database, {
          childOf: parentSpan,
          domainName: DomainNames.DB,
          className: ClassNames.RDB,
          disableActiveStart: true,
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
            [SpanTags.TRIGGER_OPERATION_NAMES]: [params.host],
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
            [SpanTags.OPERATION_TYPE]: SQLQueryOperationTypes[statementType] ? SQLQueryOperationTypes[statementType] : 'READ',
          });
        }

        const originalCallback = pgQuery.callback;

        pgQuery.callback = (err: any, res: any) => {
          if (err) {
            const parseError = Utils.parseError(err);
            span.setTag('error', true);
            span.setTag('error.kind', parseError.errorType);
            span.setTag('error.message', parseError.errorMessage);
          }

          span.close();

          if (originalCallback) {
            originalCallback(err, res);
          }
        };

        return pgQuery;

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
