import Integration from './Integration';
import ThundraTracer from '../../opentracing/Tracer';
import * as opentracing from 'opentracing';
import {
    HttpTags, SpanTags, SpanTypes, DomainNames, ClassNames, envVariableKeys,
    LAMBDA_APPLICATION_CLASS_NAME, LAMBDA_APPLICATION_DOMAIN_NAME,
} from '../../Constants';
import Utils from '../utils/Utils';
import * as url from 'url';
import ThundraLogger from '../../ThundraLogger';
import InvocationSupport from '../support/InvocationSupport';

const shimmer = require('shimmer');
const has = require('lodash.has');
const semver = require('semver');

const moduleName = 'http';

class HttpIntegration implements Integration {
    version: string;
    lib: any;
    config: any;
    basedir: string;
    wrapped: boolean;

    constructor(config: any) {
        this.wrapped = false;
        this.lib = Utils.tryRequire(moduleName);
        this.config = config;
        if (this.lib) {
            this.wrap.call(this, this.lib, config);
        }
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
                try {
                    const tracer = ThundraTracer.getInstance();

                    if (!tracer) {
                        return request.apply(this, [options, callback]);
                    }

                    const functionName = InvocationSupport.getFunctionName();

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

                    if (!(Utils.getConfiguration(envVariableKeys.DISABLE_SPAN_CONTEXT_INJECTION) === 'true')) {
                        const headers = options.headers ? options.headers : {};
                        tracer.inject(span.spanContext, opentracing.FORMAT_TEXT_MAP, headers);
                        options.headers = headers;
                    }

                    span.addTags({
                        [SpanTags.OPERATION_TYPE]: method,
                        [SpanTags.SPAN_TYPE]: SpanTypes.HTTP,
                        [HttpTags.HTTP_METHOD]: method,
                        [HttpTags.HTTP_HOST]: host,
                        [HttpTags.HTTP_PATH]: path.split('?')[0],
                        [HttpTags.HTTP_URL]: host + path,
                        [HttpTags.QUERY_PARAMS]: queryParams,
                        [SpanTags.TRACE_LINKS]: [span.spanContext.spanId],
                        [SpanTags.TOPOLOGY_VERTEX]: true,
                        [SpanTags.TRIGGER_DOMAIN_NAME]: LAMBDA_APPLICATION_DOMAIN_NAME,
                        [SpanTags.TRIGGER_CLASS_NAME]: LAMBDA_APPLICATION_CLASS_NAME,
                        [SpanTags.TRIGGER_OPERATION_NAMES]: [functionName],
                    });

                    const me = this;
                    const wrappedCallback = (err: any, res: any) => {
                        if (err && span) {
                            span.setErrorTag(err);
                        }
                        if (span) {
                            span.closeWithCallback(me, callback, [err, res]);
                        }
                    };

                    const req = request.call(this, options, wrappedCallback);

                    req.on('response', (res: any) => {
                        if ('x-amzn-requestid' in res.headers) {
                            span._setClassName(ClassNames.APIGATEWAY);
                        }
                        span.setTag(HttpTags.HTTP_STATUS, res.statusCode);
                    });

                    const emit = req.emit;
                    req.emit = function (eventName: any, arg: any) {
                        if (eventName === 'socket') {
                            if (req.listenerCount('response') === 1) {
                                req.on('response', (res: any) => res.resume());
                            }

                            if (!config.maskHttpBody && arg._httpMessage._hasBody) {
                                try {
                                    const lines = arg._httpMessage.output[0].split('\n');
                                    span.setTag(HttpTags.BODY, lines[lines.length - 1]);
                                } catch (error) {
                                    ThundraLogger.getInstance().debug(error);
                                }
                            }
                        }

                        return emit.apply(this, arguments);
                    };

                    return req;

                } catch (error) {
                    ThundraLogger.getInstance().error(error);
                    return request.apply(this, [options, callback]);
                }
            };
        }

        if (this.wrapped) {
            this.unwrap();
        }

        if (has(lib, 'request')) {
            shimmer.wrap(lib, 'request', wrapper);
            if (semver.satisfies(process.version, '>=8')) {
                shimmer.wrap(lib, 'get', wrapper);
            }
            this.wrapped = true;
        }

    }

    unwrap(): void {
        shimmer.unwrap(this.lib, 'request');
        if (semver.satisfies(process.version, '>=8')) {
            shimmer.unwrap(this.lib, 'get');
        }
        this.wrapped = false;
    }
}

export default HttpIntegration;
