import Integration from './Integration';
import * as opentracing from 'opentracing';
import { HttpTags, SpanTags, SpanTypes, DomainNames, ClassNames, TriggerHeaderTags, INTEGRATIONS } from '../Constants';
import Utils from '../utils/Utils';
import ModuleUtils from '../utils/ModuleUtils';
import * as url from 'url';
import ThundraLogger from '../ThundraLogger';
import HttpError from '../error/HttpError';
import ThundraSpan from '../opentracing/Span';
import ThundraChaosError from '../error/ThundraChaosError';
import ExecutionContextManager from '../context/ExecutionContextManager';

import HTTPUtils from '../utils/HTTPUtils';

const shimmer = require('shimmer');
const has = require('lodash.has');
const semver = require('semver');

const INTEGRATION_NAME = 'http';

/**
 * {@link Integration} implementation for HTTP integration
 * through {@code http} and {@code https} modules
 */
class HttpIntegration implements Integration {

    config: any;
    private instrumentContext: any;

    constructor(config: any) {
        ThundraLogger.debug('<HTTPIntegration> Activating HTTP integration');

        this.config = config || {};
        const httpIntegration = INTEGRATIONS[INTEGRATION_NAME];
        this.instrumentContext = ModuleUtils.instrument(
            httpIntegration.moduleNames, httpIntegration.moduleVersion,
            (lib: any, cfg: any, moduleName: string) => {
                this.wrap.call(this, lib, cfg, moduleName);
            },
            (lib: any, cfg: any, moduleName: string) => {
                this.doUnwrap.call(this, lib, moduleName);
            },
            this.config);
    }

    /**
     * @inheritDoc
     */
    wrap(lib: any, config: any, moduleName: string): void {
        ThundraLogger.debug('<HTTPIntegration> Wrap');

        const nodeVersion = process.version;

        function wrapper(request: any) {
            return function requestWrapper(options: any, callback: any) {
                let span: ThundraSpan;
                try {
                    ThundraLogger.debug('<HTTPIntegration> Tracing HTTP request:', options);

                    const { tracer } = ExecutionContextManager.get();

                    if (!tracer) {
                        ThundraLogger.debug('<HTTPIntegration> Skipped tracing request as no tracer is available');
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

                    if (HTTPUtils.isTestContainersRequest(options, host)) {
                        ThundraLogger.debug(
                            `<HTTPIntegration> Skipped tracing request as test containers docker request`);
                        return request.apply(this, [options, callback]);
                    }

                    if (!HTTPUtils.isValidUrl(host)) {
                        ThundraLogger.debug(
                            `<HTTPIntegration> Skipped tracing request as target host is blacklisted: ${host}`);
                        return request.apply(this, [options, callback]);
                    }

                    if (HTTPUtils.wasAlreadyTraced(options.headers)) {
                        ThundraLogger.debug(
                            `<HTTPIntegration> Skipped tracing request as it is already traced: ${host}`);
                        return request.apply(this, [options, callback]);
                    }

                    const parentSpan = tracer.getActiveSpan();
                    const operationName = host + Utils.getNormalizedPath(path, config.httpPathDepth);

                    ThundraLogger.debug(`<HTTPIntegration> Starting HTTP span with name ${operationName}`);

                    span = tracer._startSpan(operationName, {
                        childOf: parentSpan,
                        domainName: DomainNames.API,
                        className: ClassNames.HTTP,
                        disableActiveStart: true,
                    });

                    if (!config.httpTraceInjectionDisabled) {
                        const headers = options.headers ? options.headers : {};
                        tracer.inject(span.spanContext, opentracing.FORMAT_TEXT_MAP, headers);
                        headers[TriggerHeaderTags.RESOURCE_NAME] = operationName;
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
                    });

                    const me = this;

                    const wrappedCallback = (res: any) => {

                        if (span) {

                            HTTPUtils.fillOperationAndClassNameToSpan(span, res.headers);

                            const statusCode = res.statusCode.toString();
                            if (!config.disableHttp5xxError && statusCode.startsWith('5')) {
                                span.setErrorTag(new HttpError(res.statusMessage));
                            }

                            if (!config.disableHttp4xxError && statusCode.startsWith('4')) {
                                span.setErrorTag(new HttpError(res.statusMessage));
                            }

                            span.setTag(HttpTags.HTTP_STATUS, res.statusCode);

                            if (res && res.headers) {
                                res.headers = HTTPUtils.extractHeaders(res.headers);
                            }

                            ThundraLogger.debug(`<HTTPIntegration> Closing HTTP span with name ${operationName}`);
                            span.closeWithCallback(me, callback, [res]);
                        }
                    };

                    span._initialized();

                    const req = request.call(this, options, wrappedCallback);

                    if (!config.maskHttpBody && req.write && typeof req.write === 'function') {
                        const write = req.write;
                        req.write = function () {
                            try {
                                if (arguments[0]
                                    && (typeof arguments[0] === 'string' || arguments[0] instanceof Buffer)) {
                                    span.setTag(HttpTags.BODY, arguments[0].toString('utf8'));
                                }
                            } catch (error) {
                                ThundraLogger.error(
                                `<HTTPIntegration> Unable to get body of HTTP span with name ${operationName}:`,
                                error);
                            }

                            return write.apply(this, arguments);
                        };
                    }

                    req.once('error', (error: any) => {
                        if (span) {
                            ThundraLogger.debug(
                                `<HTTPIntegration> Because of error, closing HTTP span with name
                                ${span.getOperationName()}`, error);

                            span.setErrorTag(error);
                            span.close();
                        }
                    });

                    return req;

                } catch (error) {
                    ThundraLogger.error('<HTTPIntegration> Error occurred while tracing HTTP request:', error);

                    if (span) {
                        ThundraLogger.debug(
                            `<HTTPIntegration> Because of error, closing HTTP span with name ${span.getOperationName()}`);
                        span.close();
                    }

                    if (error instanceof ThundraChaosError) {
                        throw error;
                    } else {
                        return request.apply(this, [options, callback]);
                    }
                }
            };
        }

        if (moduleName === 'http') {
            if (has(lib, 'request')) {
                ThundraLogger.debug('<HTTPIntegration> Wrapping "http.request"');
                shimmer.wrap(lib, 'request', wrapper);
                if (semver.satisfies(nodeVersion, '>=8') && has(lib, 'get')) {
                    ThundraLogger.debug('<HTTPIntegration> Wrapping "http.get"');
                    shimmer.wrap(lib, 'get', wrapper);
                }
            }
        } else if (moduleName === 'https') {
            if (semver.satisfies(nodeVersion, '>=9')) {
                if (has(lib, 'request') && has(lib, 'get')) {
                    ThundraLogger.debug('<HTTPIntegration> Wrapping "https.request"');
                    shimmer.wrap(lib, 'request', wrapper);
                    ThundraLogger.debug('<HTTPIntegration> Wrapping "https.get"');
                    shimmer.wrap(lib, 'get', wrapper);
                }
            }
        }
    }

    /**
     * Unwraps given library
     * @param lib the library to be unwrapped
     */
    doUnwrap(lib: any, moduleName: string) {
        ThundraLogger.debug('<HTTPIntegration> Do unwrap');

        const nodeVersion = process.version;

        if (moduleName === 'http') {
            if (has(lib, 'request')) {
                ThundraLogger.debug('<HTTPIntegration> Unwrapping "http.request"');
                shimmer.unwrap(lib, 'request');
                if (semver.satisfies(nodeVersion, '>=8') && has(lib, 'get')) {
                    ThundraLogger.debug('<HTTPIntegration> Unwrapping "http.get"');
                    shimmer.unwrap(lib, 'get');
                }
            }
        } else if (moduleName === 'https') {
            if (semver.satisfies(nodeVersion, '>=9')) {
                if (has(lib, 'request') && has(lib, 'get')) {
                    ThundraLogger.debug('<HTTPIntegration> Unwrapping "https.request"');
                    shimmer.unwrap(lib, 'request');
                    ThundraLogger.debug('<HTTPIntegration> Unwrapping "https.get"');
                    shimmer.unwrap(lib, 'get');
                }
            }
        }
    }

    /**
     * @inheritDoc
     */
    unwrap(): void {
        ThundraLogger.debug('<HTTPIntegration> Unwrap');

        if (this.instrumentContext.uninstrument) {
            this.instrumentContext.uninstrument();
        }
    }
}

export default HttpIntegration;
