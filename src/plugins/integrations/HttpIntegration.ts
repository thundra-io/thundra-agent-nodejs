import Integration from './Integration';
import * as opentracing from 'opentracing';
import {
    HttpTags, SpanTags, SpanTypes, DomainNames, ClassNames,
    LAMBDA_APPLICATION_CLASS_NAME, LAMBDA_APPLICATION_DOMAIN_NAME, TriggerHeaderTags,
} from '../../Constants';
import Utils from '../utils/Utils';
import * as url from 'url';
import ThundraLogger from '../../ThundraLogger';
import HttpError from '../error/HttpError';
import ThundraSpan from '../../opentracing/Span';
import ThundraChaosError from '../error/ThundraChaosError';
import ExecutionContextManager from '../../context/ExecutionContextManager';

const shimmer = require('shimmer');
const has = require('lodash.has');
const semver = require('semver');

const thundraEndpointPattern = /^api[-\w]*\.thundra\.io$/;

const MODULE_NAME_HTTP = 'http';
const MODULE_NAME_HTTPS = 'https';

class HttpIntegration implements Integration {
    config: any;
    instrumentContext: any;

    constructor(config: any) {
        this.config = config || {};
        this.instrumentContext = Utils.instrument(
            [MODULE_NAME_HTTP, MODULE_NAME_HTTPS], null,
            (lib: any, cfg: any, moduleName: string) => {
                this.wrap.call(this, lib, cfg, moduleName);
            },
            (lib: any, cfg: any, moduleName: string) => {
                this.doUnwrap.call(this, lib, moduleName);
            },
            this.config);
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

    wrap(lib: any, config: any, moduleName: string): void {
        const nodeVersion = process.version;
        const plugin = this;

        function wrapper(request: any) {
            return function requestWrapper(options: any, callback: any) {
                let span: ThundraSpan;
                try {
                    const { tracer } = ExecutionContextManager.get();

                    if (!tracer) {
                        return request.apply(this, [options, callback]);
                    }

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

                    if (!config.httpTraceInjectionDisabled) {
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
                                    ThundraLogger.error(error);
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
                        ThundraLogger.error(error);
                        return request.apply(this, [options, callback]);
                    }
                }
            };
        }

        if (moduleName === 'http') {
            if (has(lib, 'request')) {
                shimmer.wrap(lib, 'request', wrapper);
                if (semver.satisfies(nodeVersion, '>=8') && has(lib, 'get')) {
                    shimmer.wrap(lib, 'get', wrapper);
                }
            }
        } else if (moduleName === 'https') {
            if (semver.satisfies(nodeVersion, '>=9')) {
                if (has(lib, 'request') && has(lib, 'get')) {
                    shimmer.wrap(lib, 'request', wrapper);
                    shimmer.wrap(lib, 'get', wrapper);
                }
            }
        }
    }

    doUnwrap(lib: any, moduleName: string) {
        const nodeVersion = process.version;

        if (moduleName === 'http') {
            if (has(lib, 'request')) {
                shimmer.unwrap(lib, 'request');
                if (semver.satisfies(nodeVersion, '>=8') && has(lib, 'get')) {
                    shimmer.unwrap(lib, 'get');
                }
            }
        } else if (moduleName === 'https') {
            if (semver.satisfies(nodeVersion, '>=9')) {
                if (has(lib, 'request') && has(lib, 'get')) {
                    shimmer.unwrap(lib, 'request');
                    shimmer.unwrap(lib, 'get');
                }
            }
        }
    }

    unwrap(): void {
        if (this.instrumentContext.uninstrument) {
            this.instrumentContext.uninstrument();
        }
    }
}

export default HttpIntegration;
