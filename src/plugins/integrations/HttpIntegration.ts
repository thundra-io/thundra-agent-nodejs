import Integration from './Integration';
import ThundraTracer from '../../opentracing/Tracer';
import { HttpTags, SpanTags, SpanTypes, DomainNames, ClassNames } from '../../Constants';
import Utils from '../Utils';
import * as url from 'url';

const shimmer = require('shimmer');
const Hook = require('require-in-the-middle');

class HttpIntegration implements Integration {
  version: string;
  lib: any;
  config: any;
  hook: any;
  basedir: string;

  constructor(tracer: ThundraTracer, config: any) {
    this.hook = Hook('http', { internals: true }, (exp: any, name: string, basedir: string) => {
      if (name === 'http') {
          this.lib = exp;
          this.config = config;
          this.basedir = basedir;

          this.wrap.call(this, exp, tracer, config);
      }
      return exp;
    });
  }

  wrap(lib: any, tracer: ThundraTracer, config: any) {
    function wrapper(request: any) {
      return function requestWrapper(options: any, callback: any) {
        const method = (options.method || 'GET').toUpperCase();
        options = typeof options === 'string' ? url.parse(options) : options;
        const host =  options.hostname || options.host || 'localhost';
        const path =  options.path || options.pathname || '/';

        if (host === 'collector.thundra.io' || host === 'serverless.com') {
          return request.apply(this, [options, callback]);
        }

        const parentSpan = tracer.getActiveSpan();
        const span = tracer._startSpan(host + path, {
            childOf : parentSpan,
            domainName: DomainNames.API,
            className: ClassNames.HTTP,
        });

        span.addTags({
          [SpanTags.OPERATION_TYPE]: 'CALL',
          [SpanTags.SPAN_TYPE] : SpanTypes.HTTP,
          [HttpTags.HTTP_METHOD]: method,
          [HttpTags.HTTP_HOST]: host,
          [HttpTags.HTTP_PATH]: path,
          [HttpTags.HTTP_URL]: host + path,
        });

        const req = request.call(this, options, callback);

        req.on('response', (res: any) => {
          span.setTag(HttpTags.HTTP_STATUS, res.statusCode);

          res.on('end', () => span.finish());

          if (req.listenerCount('response') === 1) {
            res.resume();
          }
        });

        req.on('error', (err: any) => {
            const parseError = Utils.parseError(err);
            span.setTag('error', true);
            span.setTag('error.kind', parseError.errorType);
            span.setTag('error.message', parseError.errorMessage);
            span.setTag('error.stack', parseError.stack);
            span.setTag('error.code', parseError.code);

            span.finish();
        });

        return req;
      };
    }

    shimmer.wrap(lib, 'request', wrapper);
    shimmer.wrap(lib, 'get', wrapper);
  }

  unwrap() {
    shimmer.unwrap(this.lib, 'request');
    shimmer.unwrap(this.lib, 'get');
    this.hook.unhook();
  }
}

export default HttpIntegration;
