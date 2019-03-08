import Integration from './Integration';
import ThundraTracer from '../../opentracing/Tracer';
import {
  DBTags, SpanTags, SpanTypes, DomainNames, DBTypes, ESTags,
  LAMBDA_APPLICATION_DOMAIN_NAME, LAMBDA_APPLICATION_CLASS_NAME,
} from '../../Constants';
import ModuleVersionValidator from './ModuleVersionValidator';
import ThundraLogger from '../../ThundraLogger';
import ThundraSpan from '../../opentracing/Span';
import InvocationSupport from '../support/InvocationSupport';

const shimmer = require('shimmer');
const Hook = require('require-in-the-middle');

class ESIntegration implements Integration {
  config: any;
  lib: any;
  version: string;
  hook: any;
  basedir: string;

  constructor(config: any) {
    this.version = '>=10.5';
    this.hook = Hook('elasticsearch', { internals: true }, (exp: any, name: string, basedir: string) => {
      if (name === 'elasticsearch/src/lib/transport.js' || name === 'src/lib/transport.js') {
        const moduleValidator = new ModuleVersionValidator();
        const isValidVersion = moduleValidator.validateModuleVersion(basedir, this.version);
        if (!isValidVersion) {
          ThundraLogger.getInstance().error(`Invalid module version for ES integration.
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
  static hostSelect(me: any): Promise<any> {
    const defaultHost = {
      host: 'unknown',
      port: 0,
    };

    return new Promise((resolve, reject) => {
      if (!me || !me.connectionPool || !me.connectionPool.select) {
        return resolve(defaultHost);
      }
      me.connectionPool.select((err: any , data: any) => {
            if (err) {
              ThundraLogger.getInstance().error(`Could not get host information. ${err}`);
              return resolve(defaultHost);
            }
            return resolve(data.host);
      });
    });
  }

  wrap(lib: any, config: any) {
    function wrapRequest(request: any) {
      let span: ThundraSpan;

      return async function requestWithTrace(params: any, cb: any) {
        try {
          const tracer = ThundraTracer.getInstance();

          if (!tracer) {
            return request.call(this, params, cb);
          }

          const me = this;
          const functionName = InvocationSupport.getFunctionName();
          const parentSpan = tracer.getActiveSpan();
          const host = await ESIntegration.hostSelect(me);

          span = tracer._startSpan(params.path, {
            childOf: parentSpan,
            domainName: DomainNames.DB,
            className: DBTypes.ELASTICSEARCH.toUpperCase(),
            disableActiveStart: true,
          });

          span.addTags({
            [SpanTags.SPAN_TYPE]: SpanTypes.ELASTIC,
            [DBTags.DB_HOST]: host ? host.host : undefined,
            [DBTags.DB_PORT]: host ? host.port : undefined,
            [DBTags.DB_TYPE]: DBTypes.ELASTICSEARCH,
            [SpanTags.TOPOLOGY_VERTEX]: true,
            [SpanTags.TRIGGER_DOMAIN_NAME]: LAMBDA_APPLICATION_DOMAIN_NAME,
            [SpanTags.TRIGGER_CLASS_NAME]: LAMBDA_APPLICATION_CLASS_NAME,
            [SpanTags.TRIGGER_OPERATION_NAMES]: [functionName],
            [ESTags.ES_URL]: params.path,
            [ESTags.ES_METHOD]: params.method,
            [ESTags.ES_PARAMS]: config.maskElasticSearchStatement ? undefined : JSON.stringify(params.query),
          });

          if (JSON.stringify(params.body)) {
            span.setTag(ESTags.ES_BODY, config.maskElasticSearchStatement ? undefined : JSON.stringify(params.body));
            span.setTag(DBTags.DB_STATEMENT, config.maskElasticSearchStatement ? undefined : JSON.stringify(params.body));
          }

          if (params.method) {
            let statementType;

            switch (params.method) {
              case 'PUT':
                statementType = 'WRITE';
                break;
              case 'DELETE':
                statementType = 'DELETE';
                break;
              default:
                statementType = 'READ';
                break;
            }

            span.addTags({
              [DBTags.DB_STATEMENT_TYPE]: statementType,
              [SpanTags.OPERATION_TYPE]: statementType,
            });
          }

          const originalCallback = cb;

          const wrappedCallback = (err: any, res: any) => {
            if (err) {
              span.setErrorTag(err);
            }

            span.closeWithCallback(me, originalCallback, [err, res]);
          };

          if (typeof cb === 'function') {
            return request.call(this, params, wrappedCallback);
          } else {
            const promise = request.apply(this, arguments);

            promise.then(() => {
              span.finish();
            }).catch((err: any) => {
              span.setErrorTag(err);
              span.finish();
            });

            return promise;
          }

        } catch (error) {
          if (span) {
            span.close();
          }

          ThundraLogger.getInstance().error(error);
          return request.call(this, params, cb);
        }
      };
    }

    shimmer.wrap(lib.prototype, 'request', wrapRequest);
  }

  unwrap() {
    shimmer.unwrap(this.lib.prototype, 'request');
    this.hook.unhook();
  }
}

export default ESIntegration;
