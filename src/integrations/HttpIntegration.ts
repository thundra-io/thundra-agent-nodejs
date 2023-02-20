import Integration from './Integration';
import * as opentracing from 'opentracing';
import {
    HttpTags,
    SpanTags,
    SpanTypes,
    DomainNames,
    ClassNames,
    TriggerHeaderTags,
    INTEGRATIONS,
} from '../Constants';
import Utils from '../utils/Utils';
import ModuleUtils from '../utils/ModuleUtils';
import * as Url from 'url';
import ThundraLogger from '../ThundraLogger';
import HttpError from '../error/HttpError';
import ThundraSpan from '../opentracing/Span';
import ThundraChaosError from '../error/ThundraChaosError';
import ExecutionContextManager from '../context/ExecutionContextManager';

import HTTPUtils from '../utils/HTTPUtils';
import EncodingUtils from '../utils/EncodingUtils';

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
            return function requestWrapper(a: any, b: any, c: any) {
                let span: ThundraSpan;
                const args = HTTPUtils.parseArgs(a, b, c);
                const url = args.url;
                let options = args.options;
                const callback = args.callback;
                try {
                    ThundraLogger.debug('<HTTPIntegration> Tracing HTTP request:', options);

                    const { tracer } = ExecutionContextManager.get();
                    if (!tracer) {
                        ThundraLogger.debug('<HTTPIntegration> Skipped tracing request as no tracer is available');
                        return request.apply(this, [a, b, c]);
                    }

                    let parsedUrl = url;
                    if (typeof parsedUrl === 'string') {
                        parsedUrl = Url.parse(parsedUrl);
                    }

                    const host = (
                        (parsedUrl && parsedUrl.hostname) ||
                        (parsedUrl && parsedUrl.host) ||
                        (options && options.hostname) ||
                        (options && options.host) ||
                        (options && options.uri && options.uri.hostname) ||
                        'localhost'
                    );

                    if (callback && callback.__thundra_wrapped) {
                        ThundraLogger.debug(`<HTTPIntegration> Skipped tracing request as filtered patched callback ${host}`);
                        return request.apply(this, [a, b, c]);
                    }

                    const method = (options && options.method) || 'GET'.toUpperCase();
                    let path = (
                        (options && options.path) ||
                        (options && options.pathname) ||
                        (parsedUrl && parsedUrl.path) ||
                        (parsedUrl && parsedUrl.href) ||
                        ('')
                    );

                    const fullURL = host + path;
                    const splittedPath = path.split('?');
                    const queryParams = splittedPath.length > 1 ? splittedPath[1] : '';
                    path = splittedPath[0];
                    if (HTTPUtils.isTestContainersRequest(options, host)) {
                        ThundraLogger.debug(
                            `<HTTPIntegration> Skipped tracing request as test containers docker request`);
                        return request.apply(this, [a, b, c]);
                    }

                    if (!HTTPUtils.isValidUrl(host)) {
                        ThundraLogger.debug(
                            `<HTTPIntegration> Skipped tracing request as target host is blacklisted: ${host}`);
                        return request.apply(this, [a, b, c]);
                    }

                    if (options && HTTPUtils.wasAlreadyTraced(options.headers)) {
                        ThundraLogger.debug(
                            `<HTTPIntegration> Skipped tracing request as it is already traced: ${host}`);
                        return request.apply(this, [a, b, c]);
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
                        /**
                         * in case of missing options for inject trace create an empty options
                         */
                        if (!options) {
                            options = {};
                        }

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
                        [SpanTags.TOPOLOGY_VERTEX]: true,
                    });

                    const me = this;
                    const wrappedCallback = (res: any) => {
                        if (span) {
                            HTTPUtils.fillOperationAndClassNameToSpan(span, res.headers, host);

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

                    (wrappedCallback as any).__thundra_wrapped = true;
                    const req = request.apply(this, HTTPUtils.buildParams(url, options, wrappedCallback));
                    if (!config.maskHttpBody && req.write && typeof req.write === 'function') {
                        const write = req.write;
                        req.write = function () {
                            try {
                                if (arguments[0]
                                    && (typeof arguments[0] === 'string' || arguments[0] instanceof Buffer)) {
                                    const requestData: string | Buffer = arguments[0];
                                    if (requestData.length <= config.maxHttpBodySize) {
                                        const requestBody: string = requestData.toString('utf8');
                                        if (ThundraLogger.isDebugEnabled()) {
                                            ThundraLogger.debug(`<HTTPIntegration> Captured request body: ${requestBody}`);
                                        }
                                        span.setTag(HttpTags.BODY, requestBody);
                                    }
                                }
                            } catch (error) {
                                ThundraLogger.error(
                                    `<HTTPIntegration> Unable to get request body of HTTP span with name ${operationName}:`,
                                    error);
                            }

                            return write.apply(this, arguments);
                        };
                    }

                    if (span && !config.maskHttpResponseBody) {
                        req.on('response', (res: any) => {
                            ThundraLogger.debug(`<HTTPIntegration> On response of HTTP span with name ${operationName}`);

                            try {
                                // If there is no headers, "contentLength" will be undefined
                                // If there is no `content-length` header, `contentLength` will be `NaN`
                                const contentLength: Number | undefined =
                                    res.headers && parseInt(res.headers['content-length'], 0);
                                const responseTooBig = contentLength && contentLength > config.maxHttpResponseBodySize;
                                if (responseTooBig) {
                                    return;
                                }
                            } catch (error) {
                                ThundraLogger.error(
                                    `<HTTPIntegration> Unable to check response length of HTTP span with name ${operationName}:`,
                                    error);
                            }

                            let chunks: Buffer[] = [];
                            let totalSize: Number = 0;
                            res.prependListener('data', (chunk: any) => {
                                if (!chunk) {
                                    return;
                                }
                                totalSize += chunk.length;
                                if (totalSize <= config.maxHttpResponseBodySize) {
                                    chunks.push(typeof chunk === 'string' ? Buffer.from(chunk) : chunk);
                                } else {
                                    // No need to capture partial response body
                                    chunks = null;
                                }
                            });

                            res.on('end', () => {
                                try {
                                    if (chunks && chunks.length) {
                                        const concatedChunks = Buffer.concat(chunks);
                                        const contentEncoding = HTTPUtils.obtainIncomingMessageEncoding(res);
                                        const responseBody: string =
                                            contentEncoding
                                                ? (EncodingUtils.getPayload(
                                                    concatedChunks, contentEncoding, config.maxHttpResponseBodySize))
                                                : concatedChunks.toString('utf8');
                                        if (ThundraLogger.isDebugEnabled()) {
                                            ThundraLogger.debug(`<HTTPIntegration> Captured response body: ${responseBody}`);
                                        }

                                        if (responseBody) {
                                            span.setTag(HttpTags.RESPONSE_BODY, responseBody);
                                        }
                                    }
                                } catch (error) {
                                    ThundraLogger.error(
                                        `<HTTPIntegration> Unable to get response body of HTTP span with name ${operationName}:`,
                                        error);
                                }
                            });
                        });
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
                        return request.apply(this, [a, b, c]);
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
