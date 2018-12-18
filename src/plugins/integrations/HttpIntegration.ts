import Integration from './Integration';
import ThundraTracer from '../../opentracing/Tracer';
import * as opentracing from 'opentracing';
import { HttpTags, SpanTags, SpanTypes, DomainNames, ClassNames, envVariableKeys,
  LAMBDA_APPLICATION_CLASS_NAME, LAMBDA_APPLICATION_DOMAIN_NAME } from '../../Constants';
import Utils from '../utils/Utils';
import * as url from 'url';

const shimmer = require('shimmer');
const Hook = require('require-in-the-middle');

class HttpIntegration implements Integration {
  version: string;
  lib: any;
  config: any;
  hook: any;
  basedir: string;

  constructor(config: any) {
    this.hook = Hook('http', { internals: true }, (exp: any, name: string, basedir: string) => {
      if (name === 'http') {
        this.lib = exp;
        this.config = config;
        this.basedir = basedir;

        this.wrap.call(this, exp, config);
      }
      return exp;
    });
  }

  static isValidUrl(host: string): boolean {

    if (host.indexOf('amazonaws.com') !== -1 &&
        host.indexOf('execute-api') !== -1) {
      return true;
    }

    if (host === 'api.thundra.io' ||
        host === 'serverless.com' ||
        host.indexOf('amazonaws.com') !== -1) {
          return false;
    }

    return true;
  }

  wrap(lib: any, config: any): void {
    function wrapper(request: any) {
      return function requestWrapper(options: any, callback: any) {

        const tracer = ThundraTracer.getInstance();
        const method = (options.method || 'GET').toUpperCase();
        options = typeof options === 'string' ? url.parse(options) : options;
        const host = options.hostname || options.host || 'localhost';
        const path = options.path || options.pathname || '/';
        const queryParams = path.split('?').length > 1 ? path.split('?')[1] : '';

        if (!HttpIntegration.isValidUrl(host)) {
          return request.apply(this, [options, callback]);
        }

        const parentSpan = tracer.getActiveSpan();
        const span = tracer._startSpan(host + path, {
          childOf: parentSpan,
          domainName: DomainNames.API,
          className: ClassNames.HTTP,
          disableActiveStart: true,
        });

        if (!(Utils.getConfiguration(envVariableKeys.DISABLE_SPAN_CONTEXT_INJECTION) === 'true') ) {
          const headers = options.headers ? options.headers : {};
          tracer.inject(span.spanContext, opentracing.FORMAT_TEXT_MAP, headers);
          options.headers = headers;
        }

        span.addTags({
          [SpanTags.OPERATION_TYPE]: 'CALL',
          [SpanTags.SPAN_TYPE]: SpanTypes.HTTP,
          [HttpTags.HTTP_METHOD]: method,
          [HttpTags.HTTP_HOST]: host,
          [HttpTags.HTTP_PATH]: path.split('?')[0],
          [HttpTags.HTTP_URL]: host + path,
          [HttpTags.QUERY_PARAMS]: queryParams,
          [SpanTags.TOPOLOGY_VERTEX]: true,
          [SpanTags.TRIGGER_DOMAIN_NAME]: LAMBDA_APPLICATION_DOMAIN_NAME,
          [SpanTags.TRIGGER_CLASS_NAME]: LAMBDA_APPLICATION_CLASS_NAME,
          [SpanTags.TRIGGER_OPERATION_NAMES]: [host + path],
        });

        const req = request.call(this, options, callback);

        req.on('socket', () => {
          if (req.listenerCount('response') === 1) {
            req.on('response', (res: any) => res.resume());
          }
        });

        req.on('response', (res: any) => {
          span.setTag(HttpTags.HTTP_STATUS, res.statusCode);
          res.on('end', () => span.close());
          span.close();
        });

        req.on('error', (err: any) => {
          const parseError = Utils.parseError(err);

          span.setTag('error', true);
          span.setTag('error.kind', parseError.errorType);
          span.setTag('error.message', parseError.errorMessage);
          span.setTag('error.stack', parseError.stack);
          span.setTag('error.code', parseError.code);

          span.close();
        });

        return req;
      };
    }

    shimmer.wrap(lib, 'request', wrapper);
    shimmer.wrap(lib, 'get', wrapper);
  }

  unwrap(): void {
    shimmer.unwrap(this.lib, 'request');
    shimmer.unwrap(this.lib, 'get');
    this.hook.unhook();
  }
}

export default HttpIntegration;
