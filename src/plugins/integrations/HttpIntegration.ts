import Integration from './Integration';
import * as opentracing from 'opentracing';
import {
    HttpTags, SpanTags, SpanTypes, DomainNames, ClassNames, envVariableKeys,
    LAMBDA_APPLICATION_CLASS_NAME, LAMBDA_APPLICATION_DOMAIN_NAME, TriggerHeaderTags,
} from '../../Constants';
import Utils from '../utils/Utils';
import * as url from 'url';
import ThundraLogger from '../../ThundraLogger';
import InvocationSupport from '../support/InvocationSupport';
import HttpError from '../error/HttpError';
import ThundraSpan from '../../opentracing/Span';
import ThundraChaosError from '../error/ThundraChaosError';

const shimmer = require('shimmer');
const has = require('lodash.has');
const semver = require('semver');

const thundraEndpointPattern = /^api[-\w]*\.thundra\.io$/;

class HttpIntegration implements Integration {
    version: string;
    lib: any;
    config: any;
    basedir: string;
    wrapped: boolean;

    constructor(config: any) {
        this.wrapped = false;
        this.lib = [Utils.tryRequire('http'), Utils.tryRequire('https')];
        this.config = config;
        this.wrap.call(this, this.lib, config);
    }

    static isValidUrl(host: string): boolean {
        if (host.indexOf('amazonaws.com') !== -1 &&
            host.indexOf('execute-api') !== -1) {
            return true;
        }

        if (thundraEndpointPattern.test(host) ||
            host === 'serverless.com' ||
            host.indexOf('amazonaws.com') !== -1) {
            return false;
        }

        return true;
    }

    getNormalizedPath(path: string): string {
        try {
            const depth = this.config.httpPathDepth;
            if (depth <= 0) {
                return '';
            }
            const normalizedPath = '/' + path.split('/').filter((c) => c !== '').slice(0, depth).join('/');
            return normalizedPath;
        } catch (error) {
            return path;
        }
    }

    wrap(lib: any, config: any): void {
        const libHTTP = lib[0];
        const libHTTPS = lib[1];
        const nodeVersion = process.version;
        const plugin = this;

        function wrapper(request: any) {
            return function requestWrapper(options: any, callback: any) {
                let span: ThundraSpan;
                try {
                    const tracer = plugin.config.tracer;

                    if (!tracer) {
                        return request.apply(this, [options, callback]);
                    }

                    const functionName = InvocationSupport.getFunctionName();

                    const method = (options.method || 'GET').toUpperCase();
                    options = typeof options === 'string' ? url.parse(options) : options;
                    const host = options.hostname || options.host || 'localhost';
                    let path = options.path || options.pathname || '/';
                    const fullURL = host + path;
                    const splittedPath = path.split('?');
                    const queryParams = splittedPath.length > 1 ? splittedPath[1] : '';

                    path = splittedPath[0];

                    if (!HttpIntegration.isValidUrl(host)) {
                        return request.apply(this, [options, callback]);
                    }

                    const parentSpan = tracer.getActiveSpan();
                    const operationName = host + plugin.getNormalizedPath(path);
                    span = tracer._startSpan(operationName, {
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
                        [HttpTags.HTTP_PATH]: path,
                        [HttpTags.HTTP_URL]: fullURL,
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

                    span._initialized();

                    const req = request.call(this, options, wrappedCallback);

                    req.on('response', (res: any) => {
                        if ('x-amzn-requestid' in res.headers) {
                            span._setClassName(ClassNames.APIGATEWAY);
                        }
                        if (TriggerHeaderTags.RESOURCE_NAME in res.headers) {
                            const resourceName: string = res.headers[TriggerHeaderTags.RESOURCE_NAME];
                            span._setOperationName(resourceName);
                        }
                        const statusCode = res.statusCode.toString();
                        if (!config.disableHttp5xxError && statusCode.startsWith('5')) {
                            span.setErrorTag(new HttpError(res.statusMessage));
                        }
                        if (!config.disableHttp4xxError && statusCode.startsWith('4')) {
                            span.setErrorTag(new HttpError(res.statusMessage));
                        }
                        InvocationSupport.setTag(HttpTags.HTTP_STATUS, res.statusCode);
                        span.setTag(HttpTags.HTTP_STATUS, res.statusCode);
                    });

                    const emit = req.emit;
                    req.emit = function (eventName: any, arg: any) {
                        if (eventName === 'socket') {
                            if (req.listenerCount('response') === 1) {
                                req.on('response', (res: any) => res.resume());
                            }

                            const httpMessage = arg._httpMessage;

                            if (!config.maskHttpBody && httpMessage._hasBody) {
                                try {
                                    let lines: string[];
                                    if (has(httpMessage, 'outputData')) {
                                        lines = httpMessage.outputData[0].data.split('\n');
                                    } else if (has(httpMessage, 'output')) {
                                        lines = httpMessage.output[0].split('\n');
                                    }
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
                    if (span) {
                        span.close();
                    }

                    if (error instanceof ThundraChaosError) {
                        throw error;
                    } else {
                        ThundraLogger.getInstance().error(error);
                        return request.apply(this, [options, callback]);
                    }
                }
            };
        }

        if (this.wrapped) {
            this.unwrap();
        }

        if (has(libHTTP, 'request')) {
            shimmer.wrap(libHTTP, 'request', wrapper);
            if (semver.satisfies(nodeVersion, '>=8') && has(libHTTP, 'get')) {
                shimmer.wrap(libHTTP, 'get', wrapper);
            }
        }

        if (semver.satisfies(nodeVersion, '>=9')) {
            if (has(libHTTPS, 'request') && has(libHTTPS, 'get')) {
                shimmer.wrap(libHTTPS, 'request', wrapper);
                shimmer.wrap(libHTTPS, 'get', wrapper);
            }
        }

        this.wrapped = true;
    }

    unwrap(): void {
        const libHTTP = this.lib[0];
        const libHTTPS = this.lib[1];
        const nodeVersion = process.version;

        if (has(libHTTP, 'request')) {
            shimmer.unwrap(libHTTP, 'request');
            if (semver.satisfies(nodeVersion, '>=8') && has(libHTTP, 'get')) {
                shimmer.unwrap(libHTTP, 'get');
            }
        }

        if (semver.satisfies(nodeVersion, '>=9')) {
            if (has(libHTTPS, 'request') && has(libHTTPS, 'get')) {
                shimmer.unwrap(libHTTPS, 'request');
                shimmer.unwrap(libHTTPS, 'get');
            }
        }

        this.wrapped = false;
    }
}

export default HttpIntegration;
