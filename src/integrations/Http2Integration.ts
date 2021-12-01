import Integration from './Integration';
import * as opentracing from 'opentracing';
import {
    HttpTags,
    SpanTags,
    SpanTypes,
    DomainNames,
    ClassNames,
    TriggerHeaderTags,
    MAX_HTTP_REQUEST_SIZE,
    MAX_HTTP_RESPONSE_SIZE,
    INTEGRATIONS,
} from '../Constants';
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

const MODULE_NAME_HTTP2 = 'http2';
const INTEGRATION_NAME = 'http2';

/**
 * {@link Integration} implementation for HTTP2 integration
 * through {@code http2} module
 */
class Http2Integration implements Integration {

    config: any;
    private instrumentContext: any;

    constructor(config: any) {
        ThundraLogger.debug('<HTTP2Integration> Activating HTTP2 integration');

        this.config = config || {};
        const http2Integration = INTEGRATIONS[INTEGRATION_NAME];
        this.instrumentContext = ModuleUtils.instrument(
            http2Integration.moduleNames, http2Integration.moduleVersion,
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
        ThundraLogger.debug('<HTTP2Integration> Wrap');

        const http2Wrapper = (request: any, authority: any) => {
            return function (headers: any, options: any) {
                let span: ThundraSpan;

                try {
                    ThundraLogger.debug('<HTTP2Integration> Tracing HTTP2 request:', headers);

                    const { tracer } = ExecutionContextManager.get();

                    if (!tracer) {
                        ThundraLogger.debug('<HTTP2Integration> Skipped tracing request as no tracer is available');
                        return request.apply(this, [headers, options]);
                    }

                    const method = (headers[':method'] || 'GET').toUpperCase();
                    headers = typeof headers === 'string' ? url.parse(headers) : headers;

                    const requestUrl = new url.URL(authority);

                    const host = authority ? requestUrl.hostname : 'localhost';

                    const path = (headers[':path'] && headers[':path'] !== '/')
                        ? headers[':path'] : (requestUrl.pathname ? requestUrl.pathname : '/');

                    const fullURL = host + path;
                    const queryParams = requestUrl.search || '';

                    if (!HTTPUtils.isValidUrl(fullURL)) {
                        ThundraLogger.debug(
                            `<HTTP2Integration> Skipped tracing request as target host is blacklisted: ${host}`);
                        return request.apply(this, [headers, options]);
                    }

                    const parentSpan = tracer.getActiveSpan();
                    const operationName = host + Utils.getNormalizedPath(path, config.httpPathDepth);

                    ThundraLogger.debug(`<HTTP2Integration> Starting HTTP2 span with name ${operationName}`);

                    span = tracer._startSpan(operationName, {
                        childOf: parentSpan,
                        domainName: DomainNames.API,
                        className: ClassNames.HTTP,
                        disableActiveStart: true,
                    });

                    if (!config.httpTraceInjectionDisabled) {
                        const tempHeaders = headers ? headers : {};
                        tracer.inject(span.spanContext, opentracing.FORMAT_TEXT_MAP, tempHeaders);
                        tempHeaders[TriggerHeaderTags.RESOURCE_NAME] = operationName;
                        headers = tempHeaders;
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

                    span._initialized();

                    const clientRequest = request.apply(this, [headers, options]);

                    if (!config.maskHttpBody && clientRequest.write && typeof clientRequest.write === 'function') {
                        const write = clientRequest.write;
                        clientRequest.write = function () {
                            try {
                                if (arguments[0]
                                    && (typeof arguments[0] === 'string' || arguments[0] instanceof Buffer)) {
                                    const requestData: string | Buffer = arguments[0];
                                    if (requestData.length <= MAX_HTTP_REQUEST_SIZE) {
                                        const requestBody: string = requestData.toString('utf8');
                                        if (ThundraLogger.isDebugEnabled()) {
                                            ThundraLogger.debug(`<HTTP2Integration> Captured request body: ${requestBody}`);
                                        }
                                        span.setTag(HttpTags.BODY, requestBody);
                                    }
                                }
                            } catch (error) {
                                ThundraLogger.error(
                                    `<HTTP2Integration> Unable to get request body of HTTP2 span with name ${operationName}:`,
                                    error);
                            }

                            return write.apply(this, arguments);
                        };
                    }

                    let responseHeaders: any = {};
                    let chunks: any = [];
                    let totalSize: Number = 0;

                    clientRequest.once('response', (res: any) => {
                        ThundraLogger.debug(`<HTTP2Integration> On response of HTTP2 span with name ${operationName}`);

                        responseHeaders = HTTPUtils.extractHeaders(res);

                        try {
                            // If there is no headers, "contentLength" will be undefined
                            // If there is no `content-length` header, `contentLength` will be `NaN`
                            const contentLength: Number | undefined =
                                res.headers && parseInt(res.headers['content-length'], 0);
                            const responseTooBig = contentLength && contentLength > MAX_HTTP_RESPONSE_SIZE;
                            if (responseTooBig) {
                                return;
                            }
                        } catch (error) {
                            ThundraLogger.error(
                                `<HTTP2Integration> Unable to check response length of HTTP2 span with name ${operationName}:`,
                                error);
                        }

                        if (!config.maskHttpBody) {
                            clientRequest.once('data', (chunk: any) => {
                                if (!chunk) {
                                    return;
                                }
                                totalSize += chunk.length;
                                if (totalSize <= MAX_HTTP_RESPONSE_SIZE) {
                                    chunks.push(typeof chunk === 'string' ? Buffer.from(chunk) : chunk);
                                } else {
                                    // No need to capture partial response body
                                    chunks = null;
                                }
                            });
                        }
                    });

                    clientRequest.once('end', () => {
                        if (span) {
                            try {
                                if (chunks && chunks.length) {
                                    const responseBody: string = Buffer.concat(chunks).toString('utf8');
                                    if (ThundraLogger.isDebugEnabled()) {
                                        ThundraLogger.debug(`<HTTP2Integration> Captured response body: ${responseBody}`);
                                    }
                                    span.setTag(HttpTags.RESPONSE_BODY, responseBody);
                                }
                            } catch (error) {
                                ThundraLogger.error(
                                    `<HTTP2Integration> Unable to get response body of HTTP2 span with name ${operationName}:`,
                                    error);
                            }

                            HTTPUtils.fillOperationAndClassNameToSpan(span, responseHeaders, host);

                            const statusCode = responseHeaders[':status'] || 200;
                            if (!config.disableHttp5xxError && `${statusCode}`.startsWith('5')) {
                                span.setErrorTag(new HttpError(statusCode));
                            }
                            if (!config.disableHttp4xxError && `${statusCode}`.startsWith('4')) {
                                span.setErrorTag(new HttpError(statusCode));
                            }
                            span.setTag(HttpTags.HTTP_STATUS, statusCode);

                            ThundraLogger.debug(`<HTTP2Integration> Closing HTTP2 span with name ${operationName}`);

                            span.close();
                        }
                    });

                    clientRequest.once('error', (error: any) => {
                        if (span) {
                            span.setErrorTag(error);
                        }

                        if (clientRequest.listenerCount('error') === 0) {
                            ThundraLogger.error('<HTTP2Integration> No error listener, we should explode:', error);
                        }
                    });

                    return clientRequest;

                } catch (error) {
                    ThundraLogger.error('<HTTP2Integration> Error occurred while tracing HTTP2 request:', error);

                    if (span) {
                        ThundraLogger.debug(
                            `<HTTP2Integration> Because of error, closing HTTP2 span with name ${span.getOperationName()}`);
                        span.close();
                    }

                    if (error instanceof ThundraChaosError) {
                        throw error;
                    } else {
                        return request.apply(this, [headers, options]);
                    }
                }
            };
        };

        const wrapHttp2Connect = (connectFunction: any) => {
            return (authority: any, options: any, listener: any) => {
                const clientSession = connectFunction.apply(this, [authority, options, listener]);

                try {
                    shimmer.wrap(clientSession, 'request', (wrappedFunction: any) => http2Wrapper(wrappedFunction, authority));
                    ThundraLogger.debug('<HTTP2Integration> Wrapping "clientSession.request"');
                } catch (error) {
                    ThundraLogger.error('<HTTP2Integration> Error occurred while wrapping HTTP2 request:', error);
                }

                return clientSession;
            };
        };

        if (moduleName === MODULE_NAME_HTTP2) {
            shimmer.wrap(lib, 'connect', wrapHttp2Connect);
            ThundraLogger.debug('<HTTP2Integration> Wrapping "http2.connect"');
        }
    }

    /**
     * Unwraps given library
     * @param lib the library to be unwrapped
     * @param moduleName the moduleName
     */
    doUnwrap(lib: any, moduleName: string) {
        ThundraLogger.debug('<HTTP2Integration> Do unwrap');

        if (moduleName === MODULE_NAME_HTTP2) {
            if (has(lib, 'connect')) {
                ThundraLogger.debug('<HTTP2Integration> Unwrapping "http2.connect"');
                shimmer.unwrap(lib, 'connect');
            }
        }
    }

    /**
     * @inheritDoc
     */
    unwrap(): void {
        ThundraLogger.debug('<HTTP2Integration> Unwrap');

        if (this.instrumentContext.uninstrument) {
            this.instrumentContext.uninstrument();
        }
    }
}

export default Http2Integration;
